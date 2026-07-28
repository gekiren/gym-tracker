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
      const { message, workout_history, user_weight, weight_unit, language } = payload;

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

      // 8. Construct prompts based on language
      const systemInstruction = isEnglish
        ? "You are TreNote's elite professional strength and fitness coach. Your mission is to help the user optimize their weightlifting logs, adjust sets/reps/weight based on progressive overload & RPE, suggest routines, and explain exercise physiology. Be direct, encouraging, analytical, and professional. Keep your response extremely concise, under 150 words."
        : "あなたは筋トレ記録アプリ「TreNote」専属の超一流プロフィットネス・筋トレコーチです。ユーザーのトレーニングログを分析し、漸進性過負荷（プログレッシブ・オーバーロード）やRPE（自覚的運動強度）に基づいて、適切なセット数、レップ数、重量の調整案を提案します。親身かつプロフェッショナルで、論理的なアドバイスを提供してください。回答は必ず簡潔にし、最大でも300文字程度を目安に要点をわかりやすく回答してください。";

      const promptContext = isEnglish
        ? `[User Context]\n- Body Weight: ${user_weight || "Not set"}\n- Unit: ${weight_unit || "kg"}\n\n[Recent Workout History]\n${workout_history || "No history available"}\n\n[User Message]\n${message}`
        : `【ユーザー情報】\n- 体重: ${user_weight || "未設定"}\n- 単位: ${weight_unit || "kg"}\n\n【最近のワークアウト履歴】\n${workout_history || "履歴なし"}\n\n【ユーザーの質問】\n${message}`;

      let reply = null;

      // 9. Call Gemini API securely (Using Gemini 3.6 Flash) with retry logic for transient errors (503, 429)
      if (env.GEMINI_API_KEY) {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${env.GEMINI_API_KEY}`;
        
        let response;
        const maxRetries = 3;
        let delayMs = 1000; // Initial wait: 1 second
        
        for (let attempt = 0; attempt < maxRetries; attempt++) {
          try {
            response = await fetch(geminiUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                contents: [
                  {
                    role: "user",
                    parts: [{ text: promptContext }]
                  }
                ],
                systemInstruction: {
                  parts: [{ text: systemInstruction }]
                },
                generationConfig: {
                  maxOutputTokens: 2048,
                  temperature: 0.7
                }
              }),
            });

            if (response.ok) {
              const result = await response.json();
              reply = result?.candidates?.[0]?.content?.parts?.[0]?.text;
              if (reply) break;
            } else if (response.status !== 503 && response.status !== 429) {
              console.warn(`Gemini API non-retryable error status: ${response.status}`);
              break;
            }
          } catch (fetchErr) {
            console.warn(`Gemini API fetch error on attempt ${attempt + 1}:`, fetchErr);
          }

          // Wait before retrying (exponential backoff)
          if (attempt < maxRetries - 1) {
            console.warn(`Gemini API unavailable/busy. Retrying in ${delayMs}ms (Attempt ${attempt + 1}/${maxRetries})...`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
            delayMs *= 2;
          }
        }
      }

      // 10. Fallback to DeepSeek API if Gemini failed/busy and DEEPSEEK_API_KEY is configured
      if (!reply && env.DEEPSEEK_API_KEY) {
        console.warn("Gemini API failed or returned empty response. Attempting DeepSeek API fallback...");
        try {
          const deepseekUrl = "https://api.deepseek.com/chat/completions";
          const dsResponse = await fetch(deepseekUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${env.DEEPSEEK_API_KEY}`
            },
            body: JSON.stringify({
              model: "deepseek-chat",
              messages: [
                { role: "system", content: systemInstruction },
                { role: "user", content: promptContext }
              ],
              max_tokens: 2048,
              temperature: 0.7
            })
          });

          if (dsResponse.ok) {
            const dsResult = await dsResponse.json();
            reply = dsResult?.choices?.[0]?.message?.content;
            if (reply) {
              console.log("Successfully retrieved response from DeepSeek API fallback.");
            }
          } else {
            console.error("DeepSeek API fallback failed status:", dsResponse.status, await dsResponse.text());
          }
        } catch (dsErr) {
          console.error("Error during DeepSeek API fallback execution:", dsErr);
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