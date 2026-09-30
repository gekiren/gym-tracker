export interface Env {
  ASSETS: { fetch: (req: Request) => Promise<Response> };
  GEMINI_API_KEY: string;
  AQUA_VOICE_API_KEY: string;
  DEEPSEEK_API_KEY?: string;
}

const GEMINI_FALLBACK_MODELS = [
  'gemini-3.7-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default {
  async fetch(request: Request, env: Env, _ctx: any): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // 1. Aqua Voice API (音声認識・文字起こし)
    if (url.pathname === '/api/transcribe' && request.method === 'POST') {
      try {
        const apiKey = env.AQUA_VOICE_API_KEY;
        if (!apiKey) {
          return new Response(
            JSON.stringify({
              success: false,
              error: 'AQUA_VOICE_API_KEY が Worker 環境変数に設定されていません。Cloudflareダッシュボードで設定してください。',
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const formData = await request.formData();
        const file = (formData as any).get('file');

        if (!file || !(file instanceof Blob)) {
          return new Response(
            JSON.stringify({ success: false, error: '音声ファイル (file) がリクエストに含まれていません。' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Aqua Voice Avalon API へ転送
        const aquaFormData = new FormData();
        aquaFormData.append('file', file, (file as any).name || 'audio.webm');
        aquaFormData.append('model', 'avalon');
        aquaFormData.append('language', 'ja');

        const aquaResponse = await fetch('https://api.aquavoice.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
          body: aquaFormData,
        });

        if (!aquaResponse.ok) {
          const errText = await aquaResponse.text();
          console.error('Aqua Voice API Error:', aquaResponse.status, errText);
          return new Response(
            JSON.stringify({
              success: false,
              error: `アクアボイスAPIエラー (${aquaResponse.status}): ${errText}`,
            }),
            { status: aquaResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const result: any = await aquaResponse.json();
        return new Response(
          JSON.stringify({
            success: true,
            text: result.text || '',
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (err: any) {
        console.error('Transcribe error:', err);
        return new Response(
          JSON.stringify({ success: false, error: `文字起こし処理に失敗しました: ${err?.message || err}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 2. Gemini API (テキスト解析・構造化データ抽出)
    if (url.pathname === '/api/analyze' && request.method === 'POST') {
      try {
        const apiKey = env.GEMINI_API_KEY;
        if (!apiKey) {
          return new Response(
            JSON.stringify({
              success: false,
              error: 'GEMINI_API_KEY が Worker 環境変数に設定されていません。',
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const body: any = await request.json();
        const text = body?.text || '';
        const userContext = body?.context || {};

        if (!text.trim()) {
          return new Response(
            JSON.stringify({ success: false, error: '解析対象のテキストが空です。' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const systemInstruction = `あなたは筋トレ・フィットネス・ライフログ記録アプリ「TreNote」の専属AIパートナーです。
ユーザーの発話（音声から文字起こしされたテキスト）を解析し、以下の4大カテゴリーおよびユーザーの記憶に分類してJSON形式で抽出してください。

【抽出対象カテゴリー】
1. workouts: 筋トレの記録（種目名, 重量kg, 回数reps, セット数sets, メモnotes）
   - 例: 「ベンチプレス80キロ10回3セットやった」 -> exercise_name: "ベンチプレス", weight_kg: 80, reps: 10, sets: 3
   - 自重種目の場合は weight_kg は 0 または省略。
   - ※「水」「お茶」「プロテイン」はworkoutsに入れないこと。
2. waters: 水分摂取記録（量 amount_ml, カフェイン有無 has_caffeine）
   - 例: 「水500ml飲んだ」 -> amount_ml: 500, has_caffeine: false
   - 例: 「アイスコーヒー1杯」 -> amount_ml: 200, has_caffeine: true
   - ※プロテイン飲料はmealsへ。
3. meals: 食事・栄養記録（料理名・品名 meal_name, 食事タイプ meal_type[breakfast/lunch/dinner/snack], 推定カロリー calories, 推定タンパク質 protein）
   - 例: 「プロテイン1杯飲んだ」 -> meal_name: "プロテインシェイク", meal_type: "snack", calories: 120, protein: 24
   - 例: 「昼飯に鶏胸肉と白米食べた」 -> meal_name: "鶏胸肉と白米", meal_type: "lunch", calories: 550, protein: 40
4. dailyNotes: 体調・気分・雑記・メモ（概要 summary, 体調 condition）
   - 例: 「肩の痛みが引いて調子がいい」 -> condition: "良好 (肩の違和感解消)", summary: "肩の痛みが引いて調子が良い。"
5. memoryUpdates: ユーザーに関する重要な長期記憶（文字列配列）
   - ユーザーの目標、好み、ケガの箇所、ライフスタイルなど次回以降の会話で活かせる情報のみ抽出。

【コンテキスト情報】
- ユーザーの日付: ${userContext?.date || '本日'}
- 直前のトレーニング: ${userContext?.lastWorkout || 'なし'}
- 現在の水分摂取状況: ${userContext?.currentWaterMl || 0}ml / 目標${userContext?.waterGoalMl || 2000}ml
- 体重: ${userContext?.bodyWeight ? `${userContext.bodyWeight}kg` : '未登録'}
- 既存の記憶: ${userContext?.memory || 'なし'}

【出力形式】
必ず以下のJSONフォーマットのみを出力してください。マークダウンの装飾コード（\`\`\`json等）を含める場合も必ず有効なJSONとしてパースできるようにしてください。
{
  "reply": "ユーザーへの親しみやすく前向きな日本語の応答メッセージ（例: 『ベンチプレス80kg 10回 3セット、しっかり追い込めましたね！水分も500ml記録しておきました！』）",
  "workouts": [
    { "exercise_name": "種目名", "weight_kg": 80, "reps": 10, "sets": 3, "notes": "メモ" }
  ],
  "waters": [
    { "amount_ml": 500, "has_caffeine": false }
  ],
  "meals": [
    { "meal_name": "品名", "meal_type": "lunch", "calories": 500, "protein": 30 }
  ],
  "dailyNotes": [
    { "summary": "メモ内容", "condition": "良好" }
  ],
  "memoryUpdates": [
    "記憶すべき情報（なければ空配列）"
  ]
}`;

        // Gemini 多重モデルフォールバック実行
        let geminiResultJson: any = null;
        let lastError: any = null;

        for (const model of GEMINI_FALLBACK_MODELS) {
          try {
            const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
            const geminiRes = await fetch(endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                systemInstruction: {
                  parts: [{ text: systemInstruction }],
                },
                contents: [
                  {
                    role: 'user',
                    parts: [{ text: `ユーザーの発話内容:\n「${text}」` }],
                  },
                ],
                generationConfig: {
                  temperature: 0.2,
                  responseMimeType: 'application/json',
                },
              }),
            });

            if (!geminiRes.ok) {
              const errBody = await geminiRes.text();
              console.warn(`Model ${model} returned ${geminiRes.status}: ${errBody}`);
              lastError = new Error(`Gemini ${model} error (${geminiRes.status}): ${errBody}`);
              continue;
            }

            const resData: any = await geminiRes.json();
            const candidateText = resData?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (candidateText) {
              // JSON パース
              try {
                geminiResultJson = JSON.parse(candidateText);
                break; // 成功
              } catch (parseErr) {
                // マークダウン除去のフォールバック
                const cleaned = candidateText.replace(/```json/g, '').replace(/```/g, '').trim();
                geminiResultJson = JSON.parse(cleaned);
                break;
              }
            }
          } catch (err: any) {
            console.warn(`Model ${model} fetch exception:`, err);
            lastError = err;
          }
        }

        if (!geminiResultJson) {
          throw lastError || new Error('すべてのGeminiモデル呼び出しに失敗しました。');
        }

        return new Response(
          JSON.stringify({
            success: true,
            data: {
              reply: geminiResultJson.reply || '記録内容を確認しました。',
              workouts: Array.isArray(geminiResultJson.workouts) ? geminiResultJson.workouts : [],
              waters: Array.isArray(geminiResultJson.waters) ? geminiResultJson.waters : [],
              meals: Array.isArray(geminiResultJson.meals) ? geminiResultJson.meals : [],
              dailyNotes: Array.isArray(geminiResultJson.dailyNotes) ? geminiResultJson.dailyNotes : [],
              memoryUpdates: Array.isArray(geminiResultJson.memoryUpdates) ? geminiResultJson.memoryUpdates : [],
            },
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (err: any) {
        console.error('Analyze error:', err);
        return new Response(
          JSON.stringify({ success: false, error: `Gemini解析に失敗しました: ${err?.message || err}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 既存の WebSocket 互換（念のためのフォールバック維持）
    if (url.pathname === '/api/gemini-ws') {
      const upgradeHeader = request.headers.get('Upgrade');
      if (upgradeHeader !== 'websocket') {
        return new Response('Expected websocket', { status: 426 });
      }

      const apiKey = env.GEMINI_API_KEY;
      if (!apiKey) {
        return new Response('API key not configured in environment', { status: 500 });
      }

      const geminiUrl = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=' + apiKey;
      const targetUrl = geminiUrl.replace('wss://', 'https://');

      return fetch(targetUrl, {
        headers: {
          Upgrade: 'websocket',
          Connection: 'Upgrade',
        }
      });
    }

    return env.ASSETS.fetch(request);
  }
};
