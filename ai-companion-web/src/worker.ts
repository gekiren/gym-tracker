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

const CATEGORY_VOCABULARY_PROMPTS: Record<string, string> = {
  workout: '筋トレ, トレーニング, ベンチプレス, スクワット, デッドリフト, ダンベル, バーベル, レップ, セット, kg, キロ, 回, 自重, ドロップセット, ショルダープレス, ラットプルダウン, アームカール, レッグプレス, 腹筋',
  nutrition: '食事, 栄養, プロテイン, カロリー, kcal, タンパク質, 脂質, 炭水化物, 糖質, グラム, g, 朝食, 昼食, 夕食, 間食, 鶏胸肉, 白米, 卵, オートミール, ブロッコリー, サプリ',
  water: '水分, 水, ミリリットル, ml, お茶, 麦茶, 緑茶, コーヒー, アイスコーヒー, カフェイン, コップ, ペットボトル, 飲んだ, 補給',
  note: '体調, メモ, 睡眠, 疲労, 筋肉痛, コンディション, 良好, 違和感, 痛み, 体重, 目標, 元気, だるい',
  all: '筋トレ, ベンチプレス, スクワット, デッドリフト, ダンベル, プロテイン, レップ, セット, kg, 水, ml, カロリー, 睡眠, 体調, 鶏胸肉, 白米',
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

        const category = ((formData as any).get('category') as string) || 'all';
        const promptText = CATEGORY_VOCABULARY_PROMPTS[category] || CATEGORY_VOCABULARY_PROMPTS.all;

        // Aqua Voice Avalon API へ転送（モデル名自動フォールバック ＆ prompt 付与）
        const candidateModels = ['avalon-v1.5', 'avalon-v1', 'avalon', 'whisper-1'];
        let aquaResult: any = null;
        let lastAquaErr: string = '';

        for (const aquaModel of candidateModels) {
          const makeAquaRequest = async (includePrompt: boolean) => {
            const aquaFormData = new FormData();
            aquaFormData.append('file', file, (file as any).name || 'audio.webm');
            aquaFormData.append('model', aquaModel);
            aquaFormData.append('language', 'ja');
            if (includePrompt && promptText) {
              aquaFormData.append('prompt', promptText);
            }
            return fetch('https://api.aquavoice.com/v1/audio/transcriptions', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${apiKey}`,
              },
              body: aquaFormData,
            });
          };

          // まず語彙プロンプト付きでリクエスト
          let aquaResponse = await makeAquaRequest(true);

          // モデルが prompt パラメータ未サポート等の理由で 400 / 422 を返した場合は prompt なしで再試行
          if (!aquaResponse.ok && (aquaResponse.status === 400 || aquaResponse.status === 422)) {
            console.warn(`Aqua model ${aquaModel} returned ${aquaResponse.status} with prompt, retrying without prompt...`);
            aquaResponse = await makeAquaRequest(false);
          }

          if (aquaResponse.ok) {
            aquaResult = await aquaResponse.json();
            break;
          } else {
            const errText = await aquaResponse.text();
            lastAquaErr = `(${aquaResponse.status}): ${errText}`;
            console.warn(`Aqua Voice Model ${aquaModel} failed:`, errText);
            // 404 (model not found) 以外の認証エラー等の場合はループを抜ける
            if (aquaResponse.status !== 404) {
              break;
            }
          }
        }

        if (!aquaResult) {
          console.error('Aqua Voice All Models Error:', lastAquaErr);
          return new Response(
            JSON.stringify({
              success: false,
              error: `アクアボイスAPIエラー ${lastAquaErr}`,
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({
            success: true,
            text: aquaResult.text || '',
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

        const category = (userContext?.category as string) || 'all';

        let categoryInstruction = '';
        if (category === 'workout') {
          categoryInstruction = `\n【今回の重点カテゴリー: 🏋️ 筋トレ（workouts）】\nユーザーは筋トレ・トレーニングの記録を主目的として発話しています。workouts の抽出を最優先としてください。ただし発話内に明確な水分や食事、体調メモが含まれている場合は柔軟に併せて抽出してください。\n`;
        } else if (category === 'nutrition') {
          categoryInstruction = `\n【今回の重点カテゴリー: 🥗 食事・栄養（meals）】\nユーザーは食事・栄養・プロテインの記録を主目的として発話しています。meals の抽出を最優先としてください。\n`;
        } else if (category === 'water') {
          categoryInstruction = `\n【今回の重点カテゴリー: 💧 水分（waters）】\nユーザーは水分摂取の記録を主目的として発話しています。waters の抽出を最優先としてください。\n`;
        } else if (category === 'note') {
          categoryInstruction = `\n【今回の重点カテゴリー: 📝 雑記・メモ・体調（dailyNotes）】\nユーザーは体調や雑記メモの記録を主目的として発話しています。dailyNotes の抽出を最優先としてください。\n`;
        }

        const systemInstruction = `あなたは筋トレ・フィットネス・ライフログ記録アプリ「TreNote」の専属AIパートナーです。
ユーザーの発話（音声から文字起こしされたテキスト）を解析し、以下の4大カテゴリーおよびユーザーの記憶に分類してJSON形式で抽出してください。
${categoryInstruction}
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

【屋外音声・イヤホンマイクの誤認識への自動推正ルール】
発話テキストは屋外の環境音やBluetoothイヤホンマイク等を通じて音声認識されているため、同音異義語、当て字、数字の聞き間違いが含まれている可能性があります。
前後の文脈やフィットネス・筋トレの常識から最も妥当な単語・数値に自動推正して解釈してください。
（例: 「電池プレス」「現地プレス」 -> 「ベンチプレス」、「救助キロ」「休止キロ」 -> 「90kg」、「インクライン現地」 -> 「インクラインベンチ」など）

【コンテキスト情報】
- ユーザーの日付: ${userContext?.date || '本日'}
- 直前のトレーニング: ${userContext?.lastWorkout || 'なし'}
- 現在の水分摂取状況: ${userContext?.currentWaterMl || 0}ml / 目標${userContext?.waterGoalMl || 2000}ml
- 体重: ${userContext?.bodyWeight ? `${userContext.bodyWeight}kg` : '未登録'}
- 既存の記憶: ${userContext?.memory || 'なし'}
- 選択カテゴリー: ${category}

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
