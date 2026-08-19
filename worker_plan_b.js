/**
 * Cloudflare Worker Proxy for Gemini 3.7 Flash & Multi-Model Fallback (Gemini 3.6/3.5/2.5/2.5-Lite & DeepSeek)
 * (gym-tracker AI Coach & Nutrition Vision Analysis - Plan B / v1.8.0)
 *
 * ENDPOINTS SUPPORTED:
 * - /api/chat : Fitness AI Coach text chat
 * - /api/nutrition-image : Image-based nutrition analysis (returns structured JSON)
 * - /api/nutrition : Text-based nutrition analysis (returns structured JSON)
 */

/**
 * タイムアウト付き fetch ヘルパー
 */
async function fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError' || err.message?.includes('aborted')) {
      const timeoutErr = new Error(`Request timed out after ${timeoutMs}ms`);
      timeoutErr.name = 'TimeoutError';
      throw timeoutErr;
    }
    throw err;
  }
}

export default {
  async fetch(request, env, ctx) {
    // 1. Handle CORS Preflight Options
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    if (request.method !== "POST") {
      return new Response(JSON.stringify({ success: false, error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    try {
      const url = new URL(request.url);
      const isNutritionImageEndpoint = url.pathname.endsWith("/nutrition-image");
      const isNutritionTextEndpoint = url.pathname.endsWith("/nutrition");

      // 2. Parse Incoming Payload
      const payload = await request.json();
      const { message, image, imageBase64, textInput, workout_history, user_weight, weight_unit, language, ocrHintText, userMemo } = payload;
      const rawImageData = image || imageBase64;

      // 3. Security check: Protect from empty or invalid requests
      if (!message && !textInput && !rawImageData) {
        return new Response(JSON.stringify({ success: false, error: "Missing required fields" }), {
          status: 400,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      }

      // 4. Rate Limiting Enforcer (1,400 global requests/day)
      const today = new Date().toISOString().slice(0, 10);
      let dailyCount = 0;
      if (env.AI_LIMIT_KV) {
        const countStr = await env.AI_LIMIT_KV.get(today);
        dailyCount = countStr ? parseInt(countStr, 10) : 0;
        
        if (dailyCount >= 1400) {
          return new Response(JSON.stringify({
            success: false,
            reply: "サーバーの1日あたりの利用制限（1,400回）に達しました。明日またお試しください。"
          }), {
            status: 429,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
          });
        }
      }

      // 5. Native Blocking Guardrail (Out of scope keyword check)
      const isEnglish = (language && language.toLowerCase().startsWith("en")) || 
                        (request.headers.get("Accept-Language") || "").toLowerCase().startsWith("en");

      const outOfScopeKeywords = [
        "不動産", "マンション", "アパート", "投資", "株式", "投資信託", "暗号資産", "仮想通貨",
        "FX", "競馬", "競輪", "ギャンブル", "風俗", "アダルト", "恋愛", "出会い", "転職", "求人",
        "real estate", "crypto", "stock investment", "dating", "casino", "gambling"
      ];

      const checkText = `${message || ''} ${textInput || ''} ${userMemo || ''}`.toLowerCase();
      const isOutOfScope = outOfScopeKeywords.some(keyword => checkText.includes(keyword));

      if (isOutOfScope) {
        const blockMessage = isEnglish
          ? "I apologize, but I am a dedicated fitness and nutrition coach. I cannot help with topics unrelated to health."
          : "申し訳ありませんが、私は筋トレとフィットネスの専門コーチです。不動産、投資、金融など、トレーニングや身体づくりに関係のないトピックについてはお答えできません。";

        return new Response(JSON.stringify({ success: true, reply: blockMessage }), {
          status: 200,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      }

      // 6. Verify API Keys
      if (!env.GEMINI_API_KEY && !env.DEEPSEEK_API_KEY) {
        return new Response(JSON.stringify({ success: false, error: "AI Service misconfigured" }), {
          status: 500,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      }

      // ─── A. 画像栄養解析処理 (/api/nutrition-image または 画像添付時) ───
      if (isNutritionImageEndpoint || (rawImageData && !url.pathname.endsWith("/chat"))) {
        // 改行コード (\r, \n) や空白文字を自動削除してクレンジング
        const cleanImageData = rawImageData.replace(/[\r\n\s]/g, "");
        let mimeType = "image/jpeg";
        let base64Content = cleanImageData;

        if (cleanImageData.includes(";base64,")) {
          const parts = cleanImageData.split(";base64,");
          if (parts[0].startsWith("data:")) {
            mimeType = parts[0].replace("data:", "") || "image/jpeg";
          }
          base64Content = parts[1] || parts[0];
        } else if (cleanImageData.startsWith("data:")) {
          const parts = cleanImageData.split(",");
          base64Content = parts[1] || parts[0];
        }

        const visionSystemInstruction = `あなたは超一流のスポーツ栄養士・AIコーチです。
提供された画像（食事写真、食材、食品パッケージ、栄養成分表示ラベル、商品裏面表示など）をビジュアル解析し、必ず以下のプログラミング用JSON形式のみで回答してください。余計な解説文やMarkdownタグ（\`\`\`jsonなど）は含めないでください。

【重要：画像判定ルール】
1. 画像が「料理・食事」「食材」「食品パッケージ」「栄養成分表示（栄養成分表）ラベル」「商品裏面原材料ラベル」のいずれかである場合は、必ず "isFood": true としてください。
2. 栄養成分表示（エネルギー、たんぱく質、脂質、炭水化物、食塩相当量など）や食品の名称が記載されている場合は、記載数値を最優先で正確に読み取り、数値をJSONに抽出してください（1食分または1包装あたりの数値を基準とします）。
3. 写真が食品・飲料・栄養成分表示と一切無関係な物体（家具・家電・風景・人物のみ・機械など）の場合のみ、"isFood": false とし、advice にその旨を記述してください。

【出力JSONフォーマット】
{
  "isFood": true,
  "mealName": "食品名・商品名・料理名（例: 煎り大豆、醤油ラーメン、プロテインバー）",
  "calories": 650,
  "protein": 25.5,
  "fat": 18.0,
  "carbs": 85.0,
  "sodium": 0.5,
  "fiber": 3.2,
  "advice": "筋トレや健康管理に役立つプロの短文アドバイス（100文字程度）"
}`;

        // DEVELOPMENT_RULES.md 準拠のマルチモーダル画像解析モデルリスト (3.7-flash 優先 ➔ 3.6-flash ➔ 3.5-flash ➔ 2.5-flash ➔ 2.5-flash-lite)
        const geminiModels = ["gemini-3.7-flash", "gemini-3.6-flash", "gemini-3.5-flash", "gemini-2.5-flash", "gemini-2.5-flash-lite"];
        let lastErrorText = "";
        let fallbackHistory = [];

        if (env.GEMINI_API_KEY) {
          for (const modelName of geminiModels) {
            const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${env.GEMINI_API_KEY}`;
            
            try {
              // 画像解析は5秒で個別タイムアウト制御
              const generationConfig = { maxOutputTokens: 2048 };
              if (modelName.includes("3.7")) {
                generationConfig.thinkingConfig = { thinkingBudget: 0 };
              }

              const response = await fetchWithTimeout(geminiUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  contents: [
                    {
                      role: "user",
                      parts: [
                        { inlineData: { mimeType: mimeType, data: base64Content } },
                        { text: message || "この写真の食事内容と栄養成分を解析してください。" }
                      ]
                    }
                  ],
                  systemInstruction: { parts: [{ text: visionSystemInstruction }] },
                  generationConfig
                })
              }, 5000);

              if (response.ok) {
                const result = await response.json();
                let rawText = result?.candidates?.[0]?.content?.parts?.[0]?.text || "";
                rawText = rawText.replace(/```json/g, "").replace(/```/g, "").trim();

                try {
                  const parsedJson = JSON.parse(rawText);
                  
                  if (env.AI_LIMIT_KV) {
                    await env.AI_LIMIT_KV.put(today, (dailyCount + 1).toString(), { expirationTtl: 86400 * 2 });
                  }

                  return new Response(JSON.stringify({ 
                    success: true, 
                    ...parsedJson,
                    debugInfo: { workerVersion: "v1.8.0", modelUsed: modelName, fallbackHistory, timestamp: new Date().toISOString() }
                  }), {
                    status: 200,
                    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
                  });
                } catch (jsonErr) {
                  console.error(`JSON parse error from Gemini vision (${modelName}):`, rawText);
                  return new Response(JSON.stringify({ 
                    success: true, 
                    reply: rawText, 
                    mealName: "食事写真",
                    debugInfo: { workerVersion: "v1.8.0", modelUsed: modelName, parseError: true, rawSnippet: rawText.substring(0, 100) }
                  }), {
                    status: 200,
                    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
                  });
                }
              } else {
                lastErrorText = await response.text();
                console.error(`Gemini Vision API error (${modelName}):`, response.status, lastErrorText);
                fallbackHistory.push({ model: modelName, status: response.status, error: lastErrorText.substring(0, 150) });
              }
            } catch (fetchErr) {
              console.error(`Fetch exception for ${modelName}:`, fetchErr);
              fallbackHistory.push({ model: modelName, error: String(fetchErr?.message || fetchErr) });
            }
          }
        }

        // DeepSeek へのテキストフォールバック（画像モデル全滅時）
        const fallbackText = userMemo || ocrHintText || message;
        if (env.DEEPSEEK_API_KEY && (fallbackText?.trim() || userMemo?.trim() || ocrHintText?.trim() || message?.trim())) {
          try {
            const deepseekResponse = await fetchWithTimeout("https://api.deepseek.com/chat/completions", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${env.DEEPSEEK_API_KEY}`
              },
              body: JSON.stringify({
                model: "deepseek-v4-pro",
                messages: [
                  { role: "system", content: visionSystemInstruction },
                  { role: "user", content: `【補足メモ/テキスト】${fallbackText}\nこの食事内容から料理名、推定カロリー、PFCバランスをJSONで回答してください。` }
                ],
                response_format: { type: "json_object" }
              })
            }, 5000);

            if (deepseekResponse.ok) {
              const dsData = await deepseekResponse.json();
              let dsText = dsData?.choices?.[0]?.message?.content || "";
              dsText = dsText.replace(/```json/g, "").replace(/```/g, "").trim();
              const parsedJson = JSON.parse(dsText);

              if (env.AI_LIMIT_KV) {
                await env.AI_LIMIT_KV.put(today, (dailyCount + 1).toString(), { expirationTtl: 86400 * 2 });
              }

              return new Response(JSON.stringify({
                success: true,
                ...parsedJson,
                debugInfo: { workerVersion: "v1.8.0", modelUsed: "deepseek-v4-pro (text fallback)", fallbackHistory }
              }), {
                status: 200,
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
              });
            }
          } catch (dsErr) {
            console.error("DeepSeek fallback error:", dsErr);
            fallbackHistory.push({ model: "deepseek-v4-pro", error: String(dsErr?.message || dsErr) });
          }
        }

        // すべてのフォールバックが失敗した場合のエラーレスポンス (status: 500)
        return new Response(JSON.stringify({
          success: false,
          isFood: false,
          mealName: "食事写真",
          calories: 0,
          protein: 0,
          fat: 0,
          carbs: 0,
          sodium: 0,
          fiber: 0,
          advice: "AIによる画像解析時に一時的なエラーが発生しました。時間を置いて再実行してください。",
          debugInfo: { workerVersion: "v1.8.0", fallbackHistory, lastError: lastErrorText }
        }), {
          status: 500,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      }

      // ─── B. テキスト栄養解析処理 (/api/nutrition) ───
      if (isNutritionTextEndpoint) {
        const textNutritionInstruction = `あなたは超一流のスポーツ栄養士です。入力された食事テキスト内容を解析し、必ず以下の純粋なJSONフォーマットのみで出力してください。
{
  "isFood": true,
  "mealName": "料理名",
  "calories": 600,
  "protein": 20.0,
  "fat": 15.0,
  "carbs": 75.0,
  "sodium": 3.0,
  "fiber": 2.5,
  "advice": "栄養アドバイス"
}`;

        const geminiModels = ["gemini-3.7-flash", "gemini-3.6-flash", "gemini-3.5-flash", "gemini-2.5-flash", "gemini-2.5-flash-lite"];
        let fallbackHistory = [];

        if (env.GEMINI_API_KEY) {
          for (const modelName of geminiModels) {
            const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${env.GEMINI_API_KEY}`;
            try {
              // テキスト栄養解析は4秒で個別タイムアウト制御
              const generationConfig = { maxOutputTokens: 1024 };
              if (modelName.includes("3.7")) {
                generationConfig.thinkingConfig = { thinkingBudget: 0 };
              }

              const response = await fetchWithTimeout(geminiUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  contents: [{ role: "user", parts: [{ text: textInput || message }] }],
                  systemInstruction: { parts: [{ text: textNutritionInstruction }] },
                  generationConfig
                })
              }, 4000);

              if (response.ok) {
                const result = await response.json();
                let rawText = result?.candidates?.[0]?.content?.parts?.[0]?.text || "";
                rawText = rawText.replace(/```json/g, "").replace(/```/g, "").trim();

                try {
                  const parsedJson = JSON.parse(rawText);
                  if (env.AI_LIMIT_KV) {
                    await env.AI_LIMIT_KV.put(today, (dailyCount + 1).toString(), { expirationTtl: 86400 * 2 });
                  }
                  return new Response(JSON.stringify({
                    success: true,
                    ...parsedJson,
                    debugInfo: { workerVersion: "v1.8.0", modelUsed: modelName, fallbackHistory }
                  }), {
                    status: 200,
                    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
                  });
                } catch (e) {
                  console.error(`Text nutrition JSON parse error (${modelName}):`, rawText);
                }
              } else {
                const errTxt = await response.text();
                fallbackHistory.push({ model: modelName, status: response.status, error: errTxt.substring(0, 100) });
              }
            } catch (err) {
              console.error(`Text nutrition error for ${modelName}:`, err);
              fallbackHistory.push({ model: modelName, error: String(err?.message || err) });
            }
          }
        }

        // DeepSeek フォールバック
        if (env.DEEPSEEK_API_KEY) {
          try {
            const dsResponse = await fetchWithTimeout("https://api.deepseek.com/chat/completions", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${env.DEEPSEEK_API_KEY}`
              },
              body: JSON.stringify({
                model: "deepseek-v4-pro",
                messages: [
                  { role: "system", content: textNutritionInstruction },
                  { role: "user", content: textInput || message }
                ],
                response_format: { type: "json_object" }
              })
            }, 5000);

            if (dsResponse.ok) {
              const dsData = await dsResponse.json();
              let dsText = dsData?.choices?.[0]?.message?.content || "";
              dsText = dsText.replace(/```json/g, "").replace(/```/g, "").trim();
              const parsedJson = JSON.parse(dsText);

              if (env.AI_LIMIT_KV) {
                await env.AI_LIMIT_KV.put(today, (dailyCount + 1).toString(), { expirationTtl: 86400 * 2 });
              }

              return new Response(JSON.stringify({
                success: true,
                ...parsedJson,
                debugInfo: { workerVersion: "v1.8.0", modelUsed: "deepseek-v4-pro", fallbackHistory }
              }), {
                status: 200,
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
              });
            }
          } catch (dsErr) {
            console.error("DeepSeek text nutrition error:", dsErr);
            fallbackHistory.push({ model: "deepseek-v4-pro", error: String(dsErr?.message || dsErr) });
          }
        }

        return new Response(JSON.stringify({
          success: false,
          mealName: textInput || "食事記録",
          calories: 0,
          protein: 0,
          fat: 0,
          carbs: 0,
          sodium: 0,
          fiber: 0,
          advice: "AIによるテキスト栄養解析時に一時的なエラーが発生しました。時間を置いて再実行してください。",
          debugInfo: { workerVersion: "v1.8.0", fallbackHistory }
        }), {
          status: 500,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      }

      // ─── C. 通常のAIコーチテキスト対話 (/api/chat) ───
      const systemInstruction = isEnglish
        ? "You are TreNote's elite professional strength and fitness coach. If workout set details (weight, reps, RPE) are provided in the context, evaluate them as the user's active/historical session data and NEVER claim that data is missing. Provide clear, logical, and practical advice."
        : "あなたは筋トレ記録アプリ「TreNote」専属の超一流プロフィットネス・筋トレコーチです。提示されたコンテキストにセット記録（重量・回数・RPE等）が含まれている場合はそれを現在の実施データとして直接参照し、絶対に『データが無い』とお断りせずに具体的な調整案やアドバイスを行ってください。";

      const contextHeader = workout_history && (workout_history.includes("【重要:") || workout_history.includes("【現在"))
        ? (isEnglish ? "【Active Workout Data】" : "【現在記録中のワークアウト/セットデータ】")
        : (isEnglish ? "【Recent Workout History】" : "【最近のワークアウト履歴】");

      const promptContext = isEnglish
        ? `[User Context]\n- Body Weight: ${user_weight || "Not set"}\n\n${contextHeader}\n${workout_history || "No history available"}\n\n[User Message]\n${message}`
        : `【ユーザー情報】\n- 体重: ${user_weight || "未設定"}\n\n${contextHeader}\n${workout_history || "履歴なし"}\n\n【ユーザーの質問】\n${message}`;

      const geminiModels = ["gemini-3.7-flash", "gemini-3.6-flash", "gemini-3.5-flash", "gemini-2.5-flash", "gemini-2.5-flash-lite"];
      let chatFallbackHistory = [];

      const aiMode = payload.ai_mode || "quick";

      if (env.GEMINI_API_KEY) {
        for (const modelName of geminiModels) {
          const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${env.GEMINI_API_KEY}`;
          try {
            // AIコーチチャットはquickなら5秒、thinkingなら15秒で個別制御
            const generationConfig = { maxOutputTokens: 2048 };
            if (modelName.includes("3.7")) {
              if (aiMode === "thinking") {
                generationConfig.thinkingConfig = { thinkingBudget: 2048 };
              } else {
                generationConfig.thinkingConfig = { thinkingBudget: 0 };
              }
            }

            const response = await fetchWithTimeout(geminiUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ role: "user", parts: [{ text: promptContext }] }],
                systemInstruction: { parts: [{ text: systemInstruction }] },
                generationConfig
              })
            }, aiMode === "thinking" ? 15000 : 5000);

            if (response.ok) {
              const result = await response.json();
              const reply = result?.candidates?.[0]?.content?.parts?.[0]?.text;
              if (reply) {
                if (env.AI_LIMIT_KV) {
                  await env.AI_LIMIT_KV.put(today, (dailyCount + 1).toString(), { expirationTtl: 86400 * 2 });
                }
                return new Response(JSON.stringify({
                  success: true,
                  reply,
                  debugInfo: { workerVersion: "v1.8.0", modelUsed: modelName, chatFallbackHistory }
                }), {
                  status: 200,
                  headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
                });
              }
            } else {
              const errText = await response.text();
              chatFallbackHistory.push({ model: modelName, status: response.status, error: errText.substring(0, 100) });
            }
          } catch (chatErr) {
            console.error(`AI Coach chat error for ${modelName}:`, chatErr);
            chatFallbackHistory.push({ model: modelName, error: String(chatErr?.message || chatErr) });
          }
        }
      }

      // DeepSeek チャットフォールバック
      if (env.DEEPSEEK_API_KEY) {
        try {
          const dsResponse = await fetchWithTimeout("https://api.deepseek.com/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${env.DEEPSEEK_API_KEY}`
            },
            body: JSON.stringify({
              model: "deepseek-v4-pro",
              messages: [
                { role: "system", content: systemInstruction },
                { role: "user", content: promptContext }
              ]
            })
          }, 6000);

          if (dsResponse.ok) {
            const dsData = await dsResponse.json();
            const reply = dsData?.choices?.[0]?.message?.content;
            if (reply) {
              if (env.AI_LIMIT_KV) {
                await env.AI_LIMIT_KV.put(today, (dailyCount + 1).toString(), { expirationTtl: 86400 * 2 });
              }
              return new Response(JSON.stringify({
                success: true,
                reply,
                debugInfo: { workerVersion: "v1.8.0", modelUsed: "deepseek-v4-pro", chatFallbackHistory }
              }), {
                status: 200,
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
              });
            }
          }
        } catch (dsErr) {
          console.error("DeepSeek chat fallback error:", dsErr);
          chatFallbackHistory.push({ model: "deepseek-v4-pro", error: String(dsErr?.message || dsErr) });
        }
      }

      return new Response(JSON.stringify({ 
        success: false, 
        error: "AI Service Error",
        debugInfo: { workerVersion: "v1.8.0", chatFallbackHistory }
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });

    } catch (err) {
      console.error("Internal Worker Error:", err);
      return new Response(JSON.stringify({ success: false, error: "Internal Server Error" }), {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }
  }
};
