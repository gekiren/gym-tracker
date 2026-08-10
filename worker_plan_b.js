/**
 * Cloudflare Worker Proxy for Gemini 3.6 Flash & DeepSeek Fallback
 * (gym-tracker AI Coach & Nutrition Vision Analysis - Plan B)
 *
 * ENDPOINTS SUPPORTED:
 * - /api/chat : Fitness AI Coach text chat
 * - /api/nutrition-image : Image-based nutrition analysis (returns structured JSON)
 * - /api/nutrition : Text-based nutrition analysis (returns structured JSON)
 */

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
      const { message, image, imageBase64, textInput, workout_history, user_weight, weight_unit, language } = payload;
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

      const checkText = `${message || ''} ${textInput || ''}`.toLowerCase();
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

        if (cleanImageData.startsWith("data:")) {
          const matches = cleanImageData.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
          if (matches) {
            mimeType = matches[1];
            base64Content = matches[2];
          } else {
            base64Content = cleanImageData.split(",")[1] || cleanImageData;
          }
        }

        const visionSystemInstruction = `あなたは超一流のスポーツ栄養士・AIコーチです。
提供された食事写真（または栄養成分表示ラベル）をビジュアル解析し、必ず以下のプログラミング用JSON形式のみで回答してください。余計な解説文やMarkdownタグ（\`\`\`jsonなど）は含めないでください。

【出力JSONフォーマット】
{
  "isFood": true,
  "mealName": "推定された具体的な料理名（例: 醤油ラーメン、牛丼大盛り）",
  "calories": 650,
  "protein": 25.5,
  "fat": 18.0,
  "carbs": 85.0,
  "sodium": 6.5,
  "fiber": 3.2,
  "advice": "筋トレ効果を高めるためのプロの短文アドバイス（100文字程度）"
}

※写真が食品や栄養成分表でない場合は、"isFood": false にしてください。`;

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${env.GEMINI_API_KEY}`;
        
        const response = await fetch(geminiUrl, {
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
            generationConfig: { maxOutputTokens: 2048, temperature: 0.2 }
          })
        });

        if (response.ok) {
          const result = await response.json();
          let rawText = result?.candidates?.[0]?.content?.parts?.[0]?.text || "";
          
          // Clean JSON markdown code blocks if present
          rawText = rawText.replace(/```json/g, "").replace(/```/g, "").trim();

          try {
            const parsedJson = JSON.parse(rawText);
            
            // Increment Daily Counter
            if (env.AI_LIMIT_KV) {
              await env.AI_LIMIT_KV.put(today, (dailyCount + 1).toString(), { expirationTtl: 86400 * 2 });
            }

            return new Response(JSON.stringify({ success: true, ...parsedJson }), {
              status: 200,
              headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
            });
          } catch (jsonErr) {
            console.error("JSON parse error from Gemini vision:", rawText);
            // Fallback: Return text as reply if JSON parse fails
            return new Response(JSON.stringify({ success: true, reply: rawText, mealName: "食事写真" }), {
              status: 200,
              headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
            });
          }
        } else {
          const errText = await response.text();
          console.error("Gemini Vision API error status:", response.status, errText);
          return new Response(JSON.stringify({
            success: true,
            isFood: false,
            mealName: "",
            calories: 0,
            protein: 0,
            fat: 0,
            carbs: 0,
            sodium: 0,
            fiber: 0,
            advice: "AIによる画像解析時に一時的なエラーが発生しました。別の写真またはテキスト入力をお試しください。"
          }), {
            status: 200,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
          });
        }
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

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${env.GEMINI_API_KEY}`;
        const response = await fetch(geminiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: textInput || message }] }],
            systemInstruction: { parts: [{ text: textNutritionInstruction }] },
            generationConfig: { maxOutputTokens: 1024, temperature: 0.2 }
          })
        });

        if (response.ok) {
          const result = await response.json();
          let rawText = result?.candidates?.[0]?.content?.parts?.[0]?.text || "";
          rawText = rawText.replace(/```json/g, "").replace(/```/g, "").trim();

          try {
            const parsedJson = JSON.parse(rawText);
            if (env.AI_LIMIT_KV) {
              await env.AI_LIMIT_KV.put(today, (dailyCount + 1).toString(), { expirationTtl: 86400 * 2 });
            }
            return new Response(JSON.stringify({ success: true, ...parsedJson }), {
              status: 200,
              headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
            });
          } catch (e) {
            console.error("Text nutrition JSON parse error:", rawText);
          }
        }
      }

      // ─── C. 通常のAIコーチテキスト対話 (/api/chat) ───
      const systemInstruction = isEnglish
        ? "You are TreNote's elite professional strength and fitness coach."
        : "あなたは筋トレ記録アプリ「TreNote」専属の超一流プロフィットネス・筋トレコーチです。";

      const promptContext = isEnglish
        ? `[User Context]\n- Body Weight: ${user_weight || "Not set"}\n\n[Message]\n${message}`
        : `【ユーザー情報】\n- 体重: ${user_weight || "未設定"}\n\n【ユーザーの質問】\n${message}`;

      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${env.GEMINI_API_KEY}`;
      const response = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: promptContext }] }],
          systemInstruction: { parts: [{ text: systemInstruction }] },
          generationConfig: { maxOutputTokens: 2048, temperature: 0.7 }
        })
      });

      if (response.ok) {
        const result = await response.json();
        const reply = result?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (reply) {
          if (env.AI_LIMIT_KV) {
            await env.AI_LIMIT_KV.put(today, (dailyCount + 1).toString(), { expirationTtl: 86400 * 2 });
          }
          return new Response(JSON.stringify({ success: true, reply }), {
            status: 200,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
          });
        }
      }

      return new Response(JSON.stringify({ success: false, error: "AI Service Error" }), {
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
