import { useState, useRef, useCallback, useEffect } from 'react';
import type {
  ExtractedData,
  ChatMessage,
  InitialContext,
  WorkoutRecord,
  WaterRecord,
  MealRecord,
  DailyNoteRecord,
} from '../types';
import {
  float32ToPCM16Base64,
  base64PCM24kToFloat32,
  downsampleTo16k,
  PCMStreamPlayer,
} from '../utils/audioUtils';

const GEMINI_LIVE_URL =
  'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent';

interface UseGeminiLiveOptions {
  apiKey: string;
  initialContext?: InitialContext;
  voiceName?: string;
  modelName?: string;
}

export function useGeminiLive({
  apiKey,
  initialContext,
  voiceName = 'Aoede',
  modelName = 'models/gemini-3.1-flash-live-preview',
}: UseGeminiLiveOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [micVolume, setMicVolume] = useState<number>(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [extractedData, setExtractedData] = useState<ExtractedData>({
    workouts: [],
    waters: [],
    meals: [],
    dailyNotes: [],
  });
  const [statusText, setStatusText] = useState('未接続');
  const [debugLogs, setDebugLogs] = useState<string[]>([]);

  const addLog = useCallback((msg: string) => {
    console.log(msg);
    setDebugLogs((prev) => [
      `[${new Date().toLocaleTimeString()}] ${msg}`,
      ...prev.slice(0, 40),
    ]);
  }, []);

  const isExplicitDisconnectRef = useRef<boolean>(false);
  const wsRef = useRef<WebSocket | null>(null);
  const micAudioContextRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const micSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const playerRef = useRef<PCMStreamPlayer>(new PCMStreamPlayer(24000));

  // ツールの定義
  const functionDeclarations = [
    {
      name: 'record_workout',
      description:
        '筋トレの記録（種目名、重量、回数、セット数など）を保存する。ユーザーがトレーニング内容を話した際に呼び出す。',
      parameters: {
        type: 'object',
        properties: {
          exercise_name: {
            type: 'string',
            description: 'トレーニング種目名（例: ベンチプレス, スクワット, ダンベルカール）',
          },
          weight_kg: {
            type: 'number',
            description: '使用した重量（kg）。自重の場合は0または省略。',
          },
          reps: {
            type: 'integer',
            description: '1セットあたりの回数（レップ数）',
          },
          sets: {
            type: 'integer',
            description: '行ったセット数（省略時は1）',
          },
          notes: {
            type: 'string',
            description: 'フォームのメモや疲労度などの特記事項',
          },
        },
        required: ['exercise_name'],
      },
    },
    {
      name: 'record_water',
      description:
        '水分摂取量を保存する。お水、お茶、コーヒーなどを飲んだ報告があった際に呼び出す。',
      parameters: {
        type: 'object',
        properties: {
          amount_ml: {
            type: 'integer',
            description: '摂取した水分の量（ml単位。例: 200, 500）',
          },
          has_caffeine: {
            type: 'boolean',
            description: 'コーヒーやエナジードリンクなどカフェインを含むか',
          },
        },
        required: ['amount_ml'],
      },
    },
    {
      name: 'record_meal',
      description:
        '食事内容を保存する。食べたものや間食、プロテインの摂取報告があった際に呼び出す。',
      parameters: {
        type: 'object',
        properties: {
          meal_name: {
            type: 'string',
            description: '食べたもの・料理名（例: 鶏胸肉と白米, プロテイン）',
          },
          meal_type: {
            type: 'string',
            enum: ['breakfast', 'lunch', 'dinner', 'snack'],
            description: '朝食, 昼食, 夕食, 間食',
          },
          calories: {
            type: 'number',
            description: '推定カロリー（kcal）',
          },
          protein: {
            type: 'number',
            description: '推定タンパク質量（g）',
          },
        },
        required: ['meal_name'],
      },
    },
    {
      name: 'record_daily_note',
      description:
        '今日の体調、筋肉痛の箇所、睡眠感、モチベーションなどの日記メモを保存する。',
      parameters: {
        type: 'object',
        properties: {
          condition: {
            type: 'string',
            description: '体調や気分の要約（例: 良好, 肩に筋肉痛あり）',
          },
          summary: {
            type: 'string',
            description: '今日のデイリーノート文章・ハイライト',
          },
        },
        required: ['summary'],
      },
    },
  ];

  // システムプロンプト生成
  const buildSystemInstruction = useCallback(() => {
    let contextStr = '';
    if (initialContext) {
      contextStr = `\n【TreNoteアプリからの前提データ】\n`;
      if (initialContext.lastWorkout) contextStr += `- 前回の筋トレ: ${initialContext.lastWorkout}\n`;
      if (initialContext.currentWaterMl !== undefined)
        contextStr += `- 今日の現在の水分: ${initialContext.currentWaterMl}ml / 目標${initialContext.waterGoalMl || 2000}ml\n`;
      if (initialContext.bodyWeight) contextStr += `- 現在の体重: ${initialContext.bodyWeight}kg\n`;
    }

    return `あなたは筋トレ＆ライフログ記録アプリ『TreNote』の専属AIパートナーです。
親しみやすく明るいトーン（友達のような丁寧語）でユーザーと音声対話してください。

【あなたの役割】
1. ユーザーから今日のトレーニング、食事、水分、体調をヒアリングし、自然な会話を通じてデイリーログを作成します。
2. ユーザーが「〇〇やった」「水飲んだ」「〇〇食べた」と話したら、即座に対応するツール（record_workout, record_water, record_meal, record_daily_note）を呼び出して記録してください。
3. TreNoteの前提データをもとに、あなたから自発的に「昨日の筋肉痛はどうですか？」「今日はお水飲めましたか？」などの質問を投げかけて会話をリードしてください。
4. 返答は音声として読み上げられるため、1〜2文程度で簡潔に話してください。
${contextStr}`;
  }, [initialContext]);

  const isMicRunningRef = useRef<boolean>(false);

  // マイクの初期化とストリーミング開始
  const startMicStreaming = useCallback(async (deviceId?: string) => {
    if (isMicRunningRef.current) return;
    isMicRunningRef.current = true;

    try {
      addLog('マイクストリームの初期化を開始...');
      let stream: MediaStream;
      try {
        const audioConstraints: MediaTrackConstraints = {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        };
        
        if (deviceId && deviceId !== 'default' && deviceId !== '') {
          audioConstraints.deviceId = { exact: deviceId };
          addLog(`指定されたマイクデバイスを使用します: ${deviceId}`);
        } else {
          addLog('標準マイクを使用します');
        }

        if (!navigator?.mediaDevices?.getUserMedia) {
          throw new Error('お使いのブラウザまたは接続環境（非HTTPS等）ではマイクがサポートされていません。');
        }

        stream = await navigator.mediaDevices.getUserMedia({
          audio: audioConstraints,
        });
      } catch (err: any) {
        addLog(`マイク初期取得失敗 (${err.message}) -> 基本設定(audio: true)で再試行中...`);
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      micStreamRef.current = stream;

      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioCtx();
      micAudioContextRef.current = audioCtx;

      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }
      addLog(`AudioContext 稼働中 (sampleRate: ${audioCtx.sampleRate}, state: ${audioCtx.state})`);

      const actualSampleRate = audioCtx.sampleRate;
      const source = audioCtx.createMediaStreamSource(stream);
      micSourceRef.current = source;

      // 1. 音量測定用 AnalyserNode
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      source.connect(analyser);

      // 音量メーターのループ
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let lastVol = 0;
      const updateVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        const vol = Math.min(100, Math.round((average / 64) * 100));
        if (Math.abs(vol - lastVol) >= 1) {
          lastVol = vol;
          setMicVolume(vol);
        }
        animFrameRef.current = requestAnimationFrame(updateVolume);
      };
      updateVolume();

      let pcmBuffer: number[] = [];
      const BUFFER_SIZE = 2048;
      let chunkCount = 0;
      let maxPeak = 0;

      const handleAudioData = (inputData: Float32Array) => {
        if (isMuted) return;
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

        // 最大振幅の測定（マイクが無音かどうかの判定）
        for (let i = 0; i < inputData.length; i++) {
          const abs = Math.abs(inputData[i]);
          if (abs > maxPeak) maxPeak = abs;
        }

        const downsampled16k = downsampleTo16k(inputData, actualSampleRate);
        for (let i = 0; i < downsampled16k.length; i++) {
          pcmBuffer.push(downsampled16k[i]);
        }

        if (pcmBuffer.length >= BUFFER_SIZE) {
          const chunkToSend = new Float32Array(pcmBuffer);
          pcmBuffer = [];

          const base64PCM = float32ToPCM16Base64(chunkToSend);
          const payload = {
            realtimeInput: {
              audio: {
                mime_type: 'audio/pcm;rate=16000',
                mimeType: 'audio/pcm;rate=16000',
                data: base64PCM,
              },
            },
          };
          wsRef.current.send(JSON.stringify(payload));
          chunkCount++;
          if (chunkCount % 20 === 0) {
            const peakPercent = Math.round(maxPeak * 100);
            addLog(`[マイク送信] ${chunkCount} パケット済 (${Math.round((chunkCount * 128) / 100) / 10}秒) | 最大音量: ${peakPercent}% ${peakPercent === 0 ? '⚠️無音' : 'OK'}`);
            maxPeak = 0;
          }
        }
      };

      // 2. AudioWorklet の読み込み（失敗時は ScriptProcessor へ自動フォールバック）
      try {
        await audioCtx.audioWorklet.addModule('/mic-processor.js');
        const workletNode = new AudioWorkletNode(audioCtx, 'mic-processor');
        workletNodeRef.current = workletNode;
        workletNode.port.onmessage = (e) => handleAudioData(e.data);
        source.connect(workletNode);
        workletNode.connect(audioCtx.destination);
        addLog('AudioWorklet パイプライン稼働成功');
      } catch (workletErr) {
        addLog(`AudioWorklet 失敗、ScriptProcessor にフォールバック: ${workletErr}`);
        const processor = audioCtx.createScriptProcessor(2048, 1, 1);
        processor.onaudioprocess = (e) => handleAudioData(e.inputBuffer.getChannelData(0));
        source.connect(processor);
        processor.connect(audioCtx.destination);
      }
    } catch (err: any) {
      addLog(`マイク取得エラー: ${err?.message || err}`);
      setStatusText('マイクのアクセス許可が必要です');
    }
  }, [addLog, isMuted]);

  // マイクの停止
  const stopMicStreaming = useCallback(() => {
    isMicRunningRef.current = false;
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (workletNodeRef.current) {
      try {
        workletNodeRef.current.disconnect();
      } catch (_) {}
      workletNodeRef.current = null;
    }
    if (analyserRef.current) {
      try {
        analyserRef.current.disconnect();
      } catch (_) {}
      analyserRef.current = null;
    }
    if (micSourceRef.current) {
      try {
        micSourceRef.current.disconnect();
      } catch (_) {}
      micSourceRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    if (micAudioContextRef.current) {
      try {
        micAudioContextRef.current.close();
      } catch (_) {}
      micAudioContextRef.current = null;
    }
    setMicVolume(0);
  }, []);

  // 接続処理
  const connect = useCallback(async (deviceId?: string) => {
    isExplicitDisconnectRef.current = false;
    const trimmedKey = apiKey.trim();
    if (!trimmedKey) {
      setStatusText('Gemini APIキーを入力してください');
      return;
    }

    setIsConnecting(true);
    setStatusText('接続中...');
    playerRef.current.init();

    // ユーザー操作の瞬間にマイクとAudioContextを確実に起動
    await startMicStreaming(deviceId);

    try {
      const url = `${GEMINI_LIVE_URL}?key=${trimmedKey}`;
      console.log('Gemini Live へ接続試行中...', url);
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('Gemini Live WebSocket 接続成功. Setup を送信します...');
        setStatusText('初期化中...');

        // 1. Setup メッセージの送信
        const setupMessage = {
          setup: {
            model: modelName,
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: voiceName,
                  },
                },
              },
            },
            systemInstruction: {
              parts: [{ text: buildSystemInstruction() }],
            },
            tools: [{ functionDeclarations }],
          },
        };

        console.log('Setup payload:', JSON.stringify(setupMessage));
        ws.send(JSON.stringify(setupMessage));
      };

      ws.onmessage = async (event) => {
        try {
          let data: any;
          if (event.data instanceof Blob) {
            const text = await event.data.text();
            data = JSON.parse(text);
          } else {
            data = JSON.parse(event.data);
          }

          console.log('[Gemini Live WS Msg]:', Object.keys(data).join(', '), data);

          // セットアップ完了
          if (data.setupComplete) {
            addLog('Gemini Live Setup 完了！音声対話を開始できます。');
            setIsConnected(true);
            setIsConnecting(false);
            setStatusText('音声対話中（いつでも話しかけてください）');
            return;
          }

          // サーバーからのコンテンツ（音声・テキスト）
          if (data.serverContent) {
            const { modelTurn, interrupted, turnComplete } = data.serverContent;

            if (interrupted) {
              addLog('【AI発話】ユーザーの割り込みを検知');
              playerRef.current.stopAll();
            }

            if (modelTurn && modelTurn.parts) {
              for (const part of modelTurn.parts) {
                // 音声データの再生
                if (part.inlineData && part.inlineData.data) {
                  const float32 = base64PCM24kToFloat32(part.inlineData.data);
                  playerRef.current.playChunk(float32);
                }
                // テキストの追加
                if (part.text) {
                  addLog(`【AI応答】${part.text}`);
                  setMessages((prev) => [
                    ...prev,
                    {
                      id: Math.random().toString(36).substring(7),
                      sender: 'ai',
                      text: part.text,
                      timestamp: Date.now(),
                    },
                  ]);
                }
              }
            }

            if (turnComplete) {
              addLog('【ターン完了】AIの応答が終了しました');
            }
          }

          // Function Calling (Tool Calls)
          if (data.toolCall && data.toolCall.functionCalls) {
            const functionResponses = [];

            for (const call of data.toolCall.functionCalls) {
              const { name, args, id } = call;
              addLog(`【自動抽出ツール呼び出し】${name}: ${JSON.stringify(args)}`);

              const now = Date.now();
              if (name === 'record_workout') {
                const newWorkout: WorkoutRecord = {
                  id: Math.random().toString(36).substring(7),
                  exercise_name: args.exercise_name,
                  weight_kg: args.weight_kg,
                  reps: args.reps,
                  sets: args.sets || 1,
                  notes: args.notes,
                  timestamp: now,
                };
                setExtractedData((prev) => ({
                  ...prev,
                  workouts: [...prev.workouts, newWorkout],
                }));
              } else if (name === 'record_water') {
                const newWater: WaterRecord = {
                  id: Math.random().toString(36).substring(7),
                  amount_ml: args.amount_ml,
                  has_caffeine: args.has_caffeine,
                  timestamp: now,
                };
                setExtractedData((prev) => ({
                  ...prev,
                  waters: [...prev.waters, newWater],
                }));
              } else if (name === 'record_meal') {
                const newMeal: MealRecord = {
                  id: Math.random().toString(36).substring(7),
                  meal_name: args.meal_name,
                  meal_type: args.meal_type,
                  calories: args.calories,
                  protein: args.protein,
                  timestamp: now,
                };
                setExtractedData((prev) => ({
                  ...prev,
                  meals: [...prev.meals, newMeal],
                }));
              } else if (name === 'record_daily_note') {
                const newNote: DailyNoteRecord = {
                  id: Math.random().toString(36).substring(7),
                  condition: args.condition,
                  summary: args.summary,
                  timestamp: now,
                };
                setExtractedData((prev) => ({
                  ...prev,
                  dailyNotes: [...prev.dailyNotes, newNote],
                }));
              }

              functionResponses.push({
                id: id,
                response: {
                  output: {
                    success: true,
                    message: `${name} recorded successfully`,
                  },
                },
              });
            }

            const toolResponsePayload = {
              toolResponse: {
                functionResponses,
              },
            };
            ws.send(JSON.stringify(toolResponsePayload));
            addLog(`【ツール実行結果送信】${functionResponses.length}件の処理結果を返送しました`);
          }
        } catch (err) {
          console.error('メッセージの処理中にエラー:', err);
        }
      };

      ws.onerror = (err) => {
        console.error('WebSocket エラー:', err);
        setStatusText('通信エラーが発生しました');
        setIsConnecting(false);
        setIsConnected(false);
        stopMicStreaming();
      };

      ws.onclose = (event) => {
        console.log('WebSocket 切断 code:', event.code, 'reason:', event.reason);
        const reasonDetail = event.reason ? ` (${event.reason})` : '';

        // 意図的な切断でなく、タイムアウト等で切断された場合はセッションを自動維持
        if (!isExplicitDisconnectRef.current && (event.code === 1000 || event.code === 1006)) {
          console.log('セッション維持のための自動再接続を即時実行します...');
          setStatusText('セッション維持中（再接続）...');
          setTimeout(() => {
            if (!isExplicitDisconnectRef.current) {
              connect();
            }
          }, 300);
          return;
        }

        setStatusText(`切断されました [Code: ${event.code}${reasonDetail}]`);
        setIsConnecting(false);
        setIsConnected(false);
        stopMicStreaming();
        playerRef.current.stopAll();
      };
    } catch (err: any) {
      console.error('接続失敗:', err);
      setStatusText(`接続に失敗しました: ${err?.message || err}`);
      setIsConnecting(false);
    }
  }, [apiKey, buildSystemInstruction, functionDeclarations, modelName, startMicStreaming, stopMicStreaming, voiceName]);

  // 切断処理
  const disconnect = useCallback(() => {
    isExplicitDisconnectRef.current = true;
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    stopMicStreaming();
    playerRef.current.stopAll();
    setIsConnected(false);
    setIsConnecting(false);
    setStatusText('切断しました');
  }, [stopMicStreaming]);

  // ミュートの切り替え
  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  // テキストメッセージの送信（テストおよび併用用）
  const sendTextMessage = useCallback((text: string) => {
    if (!text.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    const payload = {
      clientContent: {
        turns: [
          {
            role: 'user',
            parts: [{ text: text.trim() }],
          },
        ],
        turnComplete: true,
      },
    };

    setMessages((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(7),
        sender: 'user',
        text: text.trim(),
        timestamp: Date.now(),
      },
    ]);

    wsRef.current.send(JSON.stringify(payload));
    console.log('[Sent Text Message]:', text.trim());
  }, []);

  // クリーンアップ
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    isConnecting,
    isMuted,
    micVolume,
    messages,
    extractedData,
    statusText,
    debugLogs,
    connect,
    disconnect,
    toggleMute,
    sendTextMessage,
    setExtractedData,
  };
}
