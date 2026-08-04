/**
 * Cloudflare Worker Proxy for Gemini 3.6 Flash & DeepSeek Fallback (gym-tracker AI Coach)
 *
 * Place this file inside your Cloudflare Workers dashboard.
 *
 * SECURES: Your Gemini API Key & DeepSeek API Key from APK extraction.
 * ENFORCES: 1,400 global requests per day limit completely free.
 * GUARDRAILS: Rejects non-fitness questions natively at the proxy level.
 * FALLBACK: Seamlessly falls back to DeepSeek API (deepseek-chat) if Gemini is busy/down.
 *
 * ENV VARIABLES REQUIRED:
 * - GEMINI_API_KEY: Secure Secret containing your Google Gemini API Key.
 * - DEEPSEEK_API_KEY: (Optional) Secure Secret containing your DeepSeek API Key for failover.
 *
 * KV NAMESPACE BINDING REQUIRED:
 * - AI_LIMIT_KV: A KV namespace bound to this Worker to track daily counts.
 */

export default {
  async fetch(request, env, ctx) {
    // 1. Handle CORS Preflight Options
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
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
      // 2. Parse Incoming Payload
      const payload = await request.json();
      const { message, workout_history, user_weight, weight_unit, language, preferred_model, ai_mode } = payload;
      const primaryModel = preferred_model === "deepseek" ? "deepseek" : "gemini";
      const isThinkingMode = ai_mode === "thinking";

      // 3. Security check: Protect from empty or invalid requests
      if (!message) {
        return new Response(JSON.stringify({ success: false, error: "Missing message field" }), {
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

      // 5. Determine language: Default to Japanese unless specified/detected as English
      const isEnglish = (language && language.toLowerCase().startsWith("en")) || 
                        (request.headers.get("Accept-Language") || "").toLowerCase().startsWith("en");

      // 6. Input Domain Guardrail check (Native blocking at the proxy)
      const outOfScopeKeywords = [
        "不動産", "マンション", "アパート", "投資", "株式", "投資信託", "暗号資産", "仮想通貨",
        "FX", "競馬", "競輪", "ギャンブル", "風俗", "アダルト", "恋愛", "出会い", "転職", "求人",
        "real estate", "crypto", "stock investment", "dating", "casino", "gambling"
      ];

      const lowercaseMsg = message.toLowerCase();
      const isOutOfScope = outOfScopeKeywords.some(keyword => lowercaseMsg.includes(keyword));

      if (isOutOfScope) {
        const blockMessage = isEnglish
          ? "I apologize, but I am a dedicated fitness and strength training coach. I cannot help with topics unrelated to training, such as finance, real estate, or lifestyle advice. Please ask me anything about workouts, nutrition, or exercise physiology!"
          : "申し訳ありませんが、私は筋トレとフィットネスの専門コーチです。不動産、投資、金融、恋愛など、トレーニングや身体づくりに関係のないトピックについてはお答えできません。筋トレメニューの調整、栄養補給、RPEの活用方法などに関するご質問があれば、お気軽にお尋ねください！";

        return new Response(JSON.stringify({ success: true, reply: blockMessage }), {
          status: 200,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      }

      // 7. Verify API Key exists
      if (!env.GEMINI_API_KEY && !env.DEEPSEEK_API_KEY) {
        console.error("Missing AI API Keys environment variables");
        return new Response(JSON.stringify({ success: false, error: "AI Service is misconfigured on server side (missing API Keys)" }), {
          status: 500,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      }

      // 8. Construct prompts based on language and AI Mode (Quick vs Thinking)
      let systemInstruction = "";
      if (isEnglish) {
        systemInstruction = isThinkingMode
          ? "You are TreNote's elite strength and fitness coach operating in THINKING MODE. Thoroughly analyze the user's workout logs, fatigue levels, progressive overload, and RPE. Provide deep, logical reasoning and detailed exercise physiology advice with actionable steps."
          : "You are TreNote's elite strength and fitness coach operating in QUICK MODE. Provide extremely fast, direct, and concise answers focusing purely on conclusion and immediate next steps without long explanations. Keep response under 100 words.";
      } else {
        systemInstruction = isThinkingMode
          ? "あなたは筋トレ記録アプリ「TreNote」専属のプロコーチです。【シンキングモード（思考あり）】として動作しています。ユーザーのトレーニング履歴、RPE、疲労度、重量推移を多角的に熟考・分析した上で、運動生理学的根拠と具体的な調整案を論理的かつ丁寧に解説してください。"
          : "あなたは筋トレ記録アプリ「TreNote」専属のプロコーチです。【クイックモード（思考なし・スピード重視）】として動作しています。前置きや冗長な解説は排除し、結論・推奨する重量レップ数・アドバイスのみを非常に迅速かつ短文で簡潔に回答してください（200文字以内目安）。";
      }

      const promptContext = isEnglish
        ? `[Mode: ${isThinkingMode ? "Thinking (Deep Analysis)" : "Quick (Fast Response)"}]\n[User Context]\n- Body Weight: ${user_weight || "Not set"}\n- Unit: ${weight_unit || "kg"}\n\n[Recent Workout History]\n${workout_history || "No history available"}\n\n[User Message]\n${message}`
        : `【動作モード: ${isThinkingMode ? "シンキングモード（思考あり）" : "クイックモード（思考なし）"}】\n【ユーザー情報】\n- 体重: ${user_weight || "未設定"}\n- 単位: ${weight_unit || "kg"}\n\n【最近のワークアウト履歴】\n${workout_history || "履歴なし"}\n\n【ユーザーの質問】\n${message}`;

      // Helper for calling Gemini API
      const callGemini = async () => {
        if (!env.GEMINI_API_KEY) return null;
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${env.GEMINI_API_KEY}`;
        const maxRetries = 2;
        let delayMs = 1000;

        // Configure thinking behavior for Gemini 3.6 Flash
        const thinkingConfig = isThinkingMode
          ? { thinkingBudget: 2048 }
          : { thinkingBudget: 0 };

        for (let attempt = 0; attempt < maxRetries; attempt++) {
          try {
            const response = await fetch(geminiUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ role: "user", parts: [{ text: promptContext }] }],
                systemInstruction: { parts: [{ text: systemInstruction }] },
                generationConfig: {
                  maxOutputTokens: isThinkingMode ? 3072 : 1024,
                  temperature: isThinkingMode ? 0.7 : 0.3,
                  thinkingConfig
                }
              }),
            });

            if (response.ok) {
              const result = await response.json();
              const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) return text;
            }
          } catch (fetchErr) {
            console.warn(`Gemini API fetch error (attempt ${attempt + 1}):`, fetchErr);
          }
          if (attempt < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
            delayMs *= 2;
          }
        }
        return null;
      };

      // Helper for calling DeepSeek API
      const callDeepSeek = async () => {
        if (!env.DEEPSEEK_API_KEY) return null;
        try {
          const deepseekUrl = "https://api.deepseek.com/chat/completions";
          const modelName = isThinkingMode ? "deepseek-reasoner" : "deepseek-chat";
          const dsResponse = await fetch(deepseekUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${env.DEEPSEEK_API_KEY}`
            },
            body: JSON.stringify({
              model: modelName,
              messages: [
                { role: "system", content: systemInstruction },
                { role: "user", content: promptContext }
              ],
              max_tokens: isThinkingMode ? 3072 : 1024,
              temperature: isThinkingMode ? 0.7 : 0.3
            })
          });

          if (dsResponse.ok) {
            const dsResult = await dsResponse.json();
            return dsResult?.choices?.[0]?.message?.content || null;
          } else {
            console.error("DeepSeek API error status:", dsResponse.status, await dsResponse.text());
          }
        } catch (dsErr) {
          console.error("Error during DeepSeek API call:", dsErr);
        }
        return null;
      };

      let reply = null;

      if (primaryModel === "deepseek") {
        console.log("Primary AI model: DeepSeek requested.");
        reply = await callDeepSeek();
        if (!reply) {
          console.warn("DeepSeek API failed or unavailable. Attempting Gemini 3.6 Flash fallback...");
          reply = await callGemini();
        }
      } else {
        console.log("Primary AI model: Gemini 3.6 Flash requested.");
        reply = await callGemini();
        if (!reply) {
          console.warn("Gemini API failed or unavailable. Attempting DeepSeek API fallback...");
          reply = await callDeepSeek();
        }
      }

      if (!reply) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: "Failed to communicate with AI models (Gemini & DeepSeek fallback failed)",
          status: 503
        }), {
          status: 502,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      }

      // 11. Increment Daily Rate Limit Counter in KV
      if (env.AI_LIMIT_KV) {
        await env.AI_LIMIT_KV.put(today, (dailyCount + 1).toString(), { expirationTtl: 86400 * 2 });
      }

      // 12. Return clean output
      return new Response(JSON.stringify({ success: true, reply }), {
        status: 200,
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