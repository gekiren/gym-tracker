import { useState, useRef, useCallback, useEffect } from 'react';
import type {
  ExtractedData,
  ChatMessage,
  InitialContext,
  WorkoutRecord,
  WaterRecord,
  MealRecord,
  DailyNoteRecord,
  MemoryRecord,
  VoiceCategory,
} from '../types';

interface UseAquaVoiceCompanionOptions {
  initialContext?: InitialContext;
  voiceName?: string;
  category?: VoiceCategory;
}

export function useAquaVoiceCompanion({
  initialContext,
  category = 'all',
}: UseAquaVoiceCompanionOptions) {

  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [micVolume, setMicVolume] = useState<number>(0);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [extractedData, setExtractedData] = useState<ExtractedData>({
    workouts: [],
    waters: [],
    meals: [],
    dailyNotes: [],
    memoryUpdates: [],
  });
  const [statusText, setStatusText] = useState('待機中（タップして話す）');
  const [debugLogs, setDebugLogs] = useState<string[]>([]);

  const addLog = useCallback((msg: string) => {
    console.log(msg);
    setDebugLogs((prev) => [
      `[${new Date().toLocaleTimeString()}] ${msg}`,
      ...prev.slice(0, 40),
    ]);
  }, []);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<any>(null);

  // クリーンアップ
  const cleanupRecording = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (_) {}
      audioContextRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    mediaRecorderRef.current = null;
    setMicVolume(0);
    setRecordingSeconds(0);
  }, []);

  useEffect(() => {
    return () => {
      cleanupRecording();
    };
  }, [cleanupRecording]);

  // 音声読み上げヘルパー（Web Speech API）
  const speakText = useCallback((text: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ja-JP';
        utterance.rate = 1.05;
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.warn('Speech synthesis error:', e);
      }
    }
  }, []);

  // Gemini 解析 API 呼び出し
  const analyzeWithGemini = useCallback(
    async (transcribedText: string) => {
      addLog(`Gemini 解析リクエスト開始: "${transcribedText}"`);
      setStatusText('Geminiで記録を解析中...');

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: transcribedText,
          context: {
            ...initialContext,
            category,
          },
        }),
      });

      if (!response.ok) {
        const errJson: any = await response.json().catch(() => ({}));
        throw new Error(errJson?.error || `Gemini解析エラー (${response.status})`);
      }

      const resData = await response.json();
      if (!resData.success || !resData.data) {
        throw new Error(resData?.error || 'Geminiの解析データが不正です。');
      }

      const { reply, workouts, waters, meals, dailyNotes, memoryUpdates } = resData.data;

      // チャットログにAIの返答を追加
      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: reply || '記録内容を確認・反映しました。',
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, aiMsg]);

      // 音声読み上げ
      if (reply) {
        speakText(reply);
      }

      // extractedData に反映
      const now = Date.now();
      const newWorkouts: WorkoutRecord[] = (workouts || []).map((w: any, idx: number) => ({
        id: `w-${now}-${idx}`,
        exercise_name: w.exercise_name || 'トレーニング',
        weight_kg: typeof w.weight_kg === 'number' ? w.weight_kg : undefined,
        reps: typeof w.reps === 'number' ? w.reps : undefined,
        sets: typeof w.sets === 'number' ? w.sets : 1,
        notes: w.notes || undefined,
        timestamp: now,
      }));

      const newWaters: WaterRecord[] = (waters || []).map((wt: any, idx: number) => ({
        id: `wt-${now}-${idx}`,
        amount_ml: typeof wt.amount_ml === 'number' ? wt.amount_ml : 200,
        has_caffeine: Boolean(wt.has_caffeine),
        timestamp: now,
      }));

      const newMeals: MealRecord[] = (meals || []).map((m: any, idx: number) => ({
        id: `m-${now}-${idx}`,
        meal_name: m.meal_name || '食事',
        meal_type: m.meal_type || 'snack',
        calories: typeof m.calories === 'number' ? m.calories : undefined,
        protein: typeof m.protein === 'number' ? m.protein : undefined,
        timestamp: now,
      }));

      const newNotes: DailyNoteRecord[] = (dailyNotes || []).map((n: any, idx: number) => ({
        id: `n-${now}-${idx}`,
        summary: n.summary || '',
        condition: n.condition || undefined,
        timestamp: now,
      }));

      const newMemories: MemoryRecord[] = (memoryUpdates || []).map((mem: any, idx: number) => ({
        id: `mem-${now}-${idx}`,
        memory_item: typeof mem === 'string' ? mem : mem?.memory_item || '',
        timestamp: now,
      }));

      setExtractedData((prev) => ({
        workouts: [...prev.workouts, ...newWorkouts],
        waters: [...prev.waters, ...newWaters],
        meals: [...prev.meals, ...newMeals],
        dailyNotes: [...prev.dailyNotes, ...newNotes],
        memoryUpdates: [...(prev.memoryUpdates || []), ...newMemories],
      }));

      const count =
        newWorkouts.length + newWaters.length + newMeals.length + newNotes.length + newMemories.length;
      addLog(`解析完了: 合計 ${count} 件の記録を抽出しました。`);
      setStatusText(`記録完了（+${count}件）`);
    },
    [initialContext, category, addLog, speakText]
  );

  // 録音開始
  const startRecording = useCallback(
    async (deviceId?: string) => {
      try {
        cleanupRecording();
        audioChunksRef.current = [];

        addLog('マイクへのアクセスを要求中...');
        setStatusText('マイク準備中...');

        let stream: MediaStream;
        try {
          const advancedConstraints: MediaStreamConstraints = {
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
            },
          };
          stream = await navigator.mediaDevices.getUserMedia(advancedConstraints);
          addLog('マイク取得成功（ノイズ抑制・エコーキャンセル有効）');
        } catch (constrErr) {
          console.warn('Advanced audio constraints failed, fallback to basic audio', constrErr);
          addLog('高度ノイズ抑制制約の適用に失敗したため、基本マイク設定にフォールバックします');
          const fallbackConstraints: MediaStreamConstraints = {
            audio: deviceId ? { deviceId: { exact: deviceId } } : true,
          };
          stream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
        }
        micStreamRef.current = stream;

        // 音量レベル解析
        try {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          const audioCtx = new AudioContextClass();
          audioContextRef.current = audioCtx;
          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 256;
          source.connect(analyser);
          analyserRef.current = analyser;

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const updateVolume = () => {
            if (!analyserRef.current) return;
            analyserRef.current.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const avg = sum / dataArray.length;
            setMicVolume(Math.min(100, Math.round((avg / 128) * 100)));
            animFrameRef.current = requestAnimationFrame(updateVolume);
          };
          updateVolume();
        } catch (e) {
          console.warn('Volume meter error:', e);
        }

        // MediaRecorder 初期化
        const mimeTypes = [
          'audio/webm;codecs=opus',
          'audio/webm',
          'audio/mp4',
          'audio/ogg',
          '',
        ];
        let supportedMime = '';
        for (const type of mimeTypes) {
          if (!type || MediaRecorder.isTypeSupported(type)) {
            supportedMime = type;
            break;
          }
        }

        const options = supportedMime ? { mimeType: supportedMime } : undefined;
        const recorder = new MediaRecorder(stream, options);
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        recorder.start(250); // 250ms ごとにスライス
        setIsRecording(true);
        setStatusText('🎙️ 音声を録音中...（話し終えたらタップ）');
        addLog(`録音開始 (${supportedMime || 'default'})`);

        // 秒数カウント
        setRecordingSeconds(0);
        timerIntervalRef.current = setInterval(() => {
          setRecordingSeconds((prev) => prev + 1);
        }, 1000);
      } catch (err: any) {
        console.error('録音開始エラー:', err);
        addLog(`マイク起動失敗: ${err?.message || err}`);
        setStatusText('マイクの起動に失敗しました');
        cleanupRecording();
      }
    },
    [addLog, cleanupRecording]
  );

  // 録音停止＆アクアボイス文字起こし＆Gemini解析
  const stopRecording = useCallback(async () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') {
      cleanupRecording();
      setIsRecording(false);
      return;
    }

    addLog('録音停止処理中...');
    setIsRecording(false);
    setIsProcessing(true);
    setStatusText('アクアボイスで文字起こし中...');

    return new Promise<void>((resolve) => {
      recorder.onstop = async () => {
        try {
          const mimeType = recorder.mimeType || 'audio/webm';
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
          cleanupRecording();

          if (audioBlob.size < 1000) {
            addLog('音声が短すぎるか空のためキャンセルしました。');
            setStatusText('音声が短すぎました（再度お話しください）');
            setIsProcessing(false);
            resolve();
            return;
          }

          addLog(`音声データサイズ: ${Math.round(audioBlob.size / 1024)} KB。アクアボイス API へ送信中...`);

          // 1. Aqua Voice API による文字起こし
          const formData = new FormData();
          formData.append('file', audioBlob, 'voice_record.webm');
          formData.append('category', category || 'all');

          const transcribeRes = await fetch('/api/transcribe', {
            method: 'POST',
            body: formData,
          });

          if (!transcribeRes.ok) {
            const errData: any = await transcribeRes.json().catch(() => ({}));
            throw new Error(errData?.error || `アクアボイス文字起こしエラー (${transcribeRes.status})`);
          }

          const transcribeData = await transcribeRes.json();
          const transcribedText = transcribeData?.text?.trim();

          if (!transcribedText) {
            addLog('文字起こし結果が空でした。');
            setStatusText('音声を認識できませんでした。もう一度お話しください。');
            setIsProcessing(false);
            resolve();
            return;
          }

          addLog(`アクアボイス文字起こし成功: "${transcribedText}"`);

          // チャットログにユーザー発話を追加
          const userMsg: ChatMessage = {
            id: `user-${Date.now()}`,
            sender: 'user',
            text: transcribedText,
            timestamp: Date.now(),
          };
          setMessages((prev) => [...prev, userMsg]);

          // 2. Gemini API による解析・構造化
          await analyzeWithGemini(transcribedText);
        } catch (err: any) {
          console.error('処理パイプラインエラー:', err);
          addLog(`エラー: ${err?.message || err}`);
          setStatusText(`エラー: ${err?.message || '処理に失敗しました'}`);
        } finally {
          setIsProcessing(false);
          resolve();
        }
      };

      recorder.stop();
    });
  }, [addLog, analyzeWithGemini, category, cleanupRecording]);

  // テキスト直接入力での送信
  const sendTextMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isProcessing) return;

      setIsProcessing(true);
      try {
        const userMsg: ChatMessage = {
          id: `user-${Date.now()}`,
          sender: 'user',
          text: trimmed,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, userMsg]);

        await analyzeWithGemini(trimmed);
      } catch (err: any) {
        console.error('Text analysis error:', err);
        addLog(`テキスト解析エラー: ${err?.message || err}`);
        setStatusText(`エラー: ${err?.message || '解析に失敗しました'}`);
      } finally {
        setIsProcessing(false);
      }
    },
    [isProcessing, analyzeWithGemini, addLog]
  );

  return {
    isRecording,
    isProcessing,
    recordingSeconds,
    micVolume,
    messages,
    extractedData,
    statusText,
    debugLogs,
    startRecording,
    stopRecording,
    sendTextMessage,
    setExtractedData,
  };
}
