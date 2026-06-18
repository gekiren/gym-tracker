import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../../src/theme';
import { useWorkoutStore } from '../../src/store/workoutStore';
import { consumeAIToken, getAITokensBalance, refundAIToken } from '../../src/db/database';
import { sendMessageToAICoach } from '../../src/services/aiCoachService';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams, router } from 'expo-router';
import { AI_CONFIG } from '../../src/config/aiConfig';

interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

export default function CoachScreen() {
  const { t } = useTranslation();
  const settings = useWorkoutStore(state => state.settings);
  const setAITokensBalance = useWorkoutStore(state => state.setAITokensBalance);
  
  const isPremium = settings.premiumUntil === 'perpetual' || (settings.premiumUntil !== '' && !isNaN(Date.parse(settings.premiumUntil)) && Date.parse(settings.premiumUntil) > Date.now());
  const isEarly = settings.isEarlyAdopter;
  const isBasic = !isPremium && !isEarly;

  const params = useLocalSearchParams<{ contextPrompt?: string; prefillMessage?: string; title?: string }>();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputVal, setInputVal] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeContext, setActiveContext] = useState<string | null>(null);
  const [contextTitle, setContextTitle] = useState<string | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);

  // 1. Initialize & load greeting message
  useEffect(() => {
    // Add default welcoming message
    setMessages([
      {
        id: 'welcome',
        text: t('ui.coach.welcome_msg') || 'こんにちは！TreNote専属AIトレーナーです。あなたの筋トレログの分析、次のセットの重量調整、あるいはトレーニング理論の質問など、何でもお手伝いします！',
        sender: 'ai',
        timestamp: new Date(),
      },
    ]);
  }, []);

  // 2. Handle context injection via route parameters (Sparkles buttons entry point)
  useEffect(() => {
    if (params.contextPrompt) {
      setActiveContext(params.contextPrompt);
      setContextTitle(params.title || 'コンテキスト');
      
      if (params.prefillMessage) {
        setInputVal(params.prefillMessage);
      }

      // Add system message into the chat showing context was linked
      const contextLinkedMsg: ChatMessage = {
        id: `system-context-${Date.now()}`,
        text: `📌 【連動コンテキスト：${params.title || 'ワークアウト詳細'}】が正常に読み込まれました。この内容に基づいてトレーナーに質問できます！`,
        sender: 'ai',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, contextLinkedMsg].slice(-100));
      scrollToBottom();
    }
  }, [params.contextPrompt, params.prefillMessage, params.title]);

  if (AI_CONFIG.status !== 'active') {
    return (
      <View style={styles.maintenanceContainer}>
        <View style={styles.maintenanceCard}>
          <View style={styles.maintenanceIconOuter}>
            <Ionicons name="build" size={42} color={Theme.colors.primary} />
          </View>
          <Text style={styles.maintenanceHeader}>
            AIトレーナー 調整中
          </Text>
          <Text style={styles.maintenanceBody}>
            AIトレーナー機能は、より快適で質の高いアドバイスを提供するため、現在メンテナンス（調整）を実施しております。
          </Text>
          <Text style={styles.maintenanceFooter}>
            まもなく再開いたしますので、今しばらくお待ちください！
          </Text>
        </View>
      </View>
    );
  }

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleSend = async (customMessage?: string) => {
    const textToSend = (customMessage || inputVal).trim();
    if (!textToSend || loading) return;

    // Consume token atomically before API request
    let consumed = false;
    try {
      consumed = await consumeAIToken();
    } catch (e) {
      console.warn('Failed to consume token', e);
    }

    if (!consumed) {
      return; // Block submission if quota is exhausted
    }

    // Update token balance UI state immediately
    try {
      const updatedBalance = await getAITokensBalance();
      setAITokensBalance(updatedBalance);
    } catch (e) {
      console.warn('Failed to update balance UI', e);
    }

    // Add user message
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      text: textToSend,
      sender: 'user',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg].slice(-100));
    setInputVal('');
    setLoading(true);
    scrollToBottom();

    try {
      // Call service to get advice
      const response = await sendMessageToAICoach(
        textToSend,
        activeContext || undefined,
        settings.bodyWeight,
        settings.weightUnit
      );

      // If failed, refund token
      if (!response.success) {
        try {
          await refundAIToken();
          const updatedBalance = await getAITokensBalance();
          setAITokensBalance(updatedBalance);
        } catch (e) {
          console.warn('Failed to refund token', e);
        }
      }

      // Add AI response
      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        text: response.reply,
        sender: 'ai',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMsg].slice(-100));
    } catch (err) {
      console.error('Error in AI Coach interaction:', err);
      // Refund token on exception
      try {
        await refundAIToken();
        const updatedBalance = await getAITokensBalance();
        setAITokensBalance(updatedBalance);
      } catch (e) {
        console.warn('Failed to refund token', e);
      }
      // Add error message to chat
      const errorMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        text: t('ui.coach.system_error') || 'システムエラーが発生しました。しばらく経ってから再度お試しください。',
        sender: 'ai',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMsg].slice(-100));
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  };

  const handleChipPress = (chipType: 'analysis' | 'proposal' | 'rpe' | 'stance') => {
    let prompt = '';
    if (chipType === 'analysis') {
      prompt = t('ui.coach.chip_analysis_prompt') || '最近の筋トレログを分析して、成長や変化について教えてください。';
    } else if (chipType === 'proposal') {
      prompt = t('ui.coach.chip_proposal_prompt') || '直近の記録を踏まえて、次回のトレーニングメニューの具体的な重量と回数の調整案を提案してください。';
    } else if (chipType === 'rpe') {
      prompt = t('ui.coach.chip_rpe_prompt') || '筋トレにおけるRPE（自覚的運動強度）を活用した効率的なセット調整方法を教えて。';
    } else if (chipType === 'stance') {
      prompt = t('ui.coach.chip_stance_prompt') || 'ベンチプレスやスクワットの足幅・グリップ幅（スタンス）を変えると、効く部位はどう変化する？';
    }

    setInputVal(prompt);
  };

  const handleClearContext = () => {
    setActiveContext(null);
    setContextTitle(null);
    setInputVal('');
    
    // Add local clearance system message
    setMessages(prev => [
      ...prev,
      {
        id: `system-clear-${Date.now()}`,
        text: '🧹 連動していたコンテキストをクリアし、通常の履歴参照モードに戻しました。',
        sender: 'ai',
        timestamp: new Date(),
      }
    ]);
    scrollToBottom();
  };

  const isQuotaExhausted = settings.aiTokensBalance === 0;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.select({ ios: 90, android: 80 })}
    >
      {/* Top Warning Banner if out of tokens */}
      {isQuotaExhausted && (
        <TouchableOpacity 
          style={styles.warningBanner} 
          onPress={() => isBasic && router.push('/(tabs)/profile')}
          activeOpacity={isBasic ? 0.8 : 1}
        >
          <Ionicons name="alert-circle" size={18} color="#fff" style={{ marginRight: 6 }} />
          <Text style={styles.warningText}>
            {isBasic 
              ? 'ベーシックプランの今月の利用枠（5回）が終了しました。プレミアムにアップグレードする' 
              : (t('ui.profile.quota_exhausted_alert') || '今月の利用枠が残っていません。')
            }
          </Text>
          {isBasic && (
            <Ionicons name="chevron-forward" size={14} color="#fff" style={{ marginLeft: 4 }} />
          )}
        </TouchableOpacity>
      )}

      {/* Active Context Linked Badge */}
      {activeContext && (
        <View style={styles.contextBadge}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <Ionicons name="link" size={16} color={Theme.colors.primary} style={{ marginRight: 6 }} />
            <Text style={styles.contextBadgeText} numberOfLines={1}>
              {`連動中: ${contextTitle}`}
            </Text>
          </View>
          <TouchableOpacity style={styles.clearContextBtn} onPress={handleClearContext}>
            <Ionicons name="close-circle" size={18} color={Theme.colors.textMuted} />
          </TouchableOpacity>
        </View>
      )}

      {/* Scrollable Message List */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.chatArea}
        contentContainerStyle={styles.chatContent}
        showsVerticalScrollIndicator={true}
      >
        {messages.map(msg => {
          const isUser = msg.sender === 'user';
          const isSystem = msg.text.startsWith('📌') || msg.text.startsWith('🧹');
          
          if (isSystem) {
            return (
              <View key={msg.id} style={styles.systemBubble}>
                <Text style={styles.systemBubbleText}>{msg.text}</Text>
              </View>
            );
          }

          return (
            <View
              key={msg.id}
              style={[
                styles.bubbleContainer,
                isUser ? styles.bubbleRight : styles.bubbleLeft,
              ]}
            >
              <View
                style={[
                  styles.bubble,
                  isUser ? styles.bubbleUser : styles.bubbleAI,
                ]}
              >
                {!isUser && (
                  <View style={styles.aiSideAccent} />
                )}
                <Text style={[styles.bubbleText, isUser ? styles.bubbleTextUser : styles.bubbleTextAI]}>
                  {msg.text}
                </Text>
              </View>
            </View>
          );
        })}

        {/* Pulsing Loading Spinner while waiting for AI */}
        {loading && (
          <View style={[styles.bubbleContainer, styles.bubbleLeft]}>
            <View style={[styles.bubble, styles.bubbleAI, styles.loadingBubble]}>
              <View style={styles.aiSideAccent} />
              <ActivityIndicator size="small" color={Theme.colors.primary} style={{ marginRight: 10 }} />
              <Text style={styles.loadingText}>AIトレーナーが分析中...</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Horizontal Suggestions Chips (Hidden if quota exhausted) */}
      {!isQuotaExhausted && !loading && (
        <View style={styles.chipsOuter}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsContainer}
          >
            <TouchableOpacity style={styles.chip} onPress={() => handleChipPress('analysis')}>
              <Text style={styles.chipText}>📊 {t('ui.coach.chip_analysis') || 'ログを分析して'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.chip} onPress={() => handleChipPress('proposal')}>
              <Text style={styles.chipText}>🔥 {t('ui.coach.chip_proposal') || '次の重量調整案'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.chip} onPress={() => handleChipPress('rpe')}>
              <Text style={styles.chipText}>💡 {t('ui.coach.chip_rpe') || 'RPEの活用法'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.chip} onPress={() => handleChipPress('stance')}>
              <Text style={styles.chipText}>📐 {t('ui.coach.chip_stance') || 'スタンスの影響'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {/* Footer Text Input Form */}
      <View style={styles.inputForm}>
        <TextInput
          style={[
            styles.textInput,
            isQuotaExhausted && styles.textInputDisabled,
          ]}
          value={inputVal}
          onChangeText={setInputVal}
          placeholder={
            isQuotaExhausted 
              ? (isBasic ? '今月の利用枠（5回）が終了しました。アップグレードしてください' : (t('ui.profile.quota_exhausted_alert') || '今月の利用枠が残っていません。'))
              : (t('ui.coach.input_placeholder') || 'トレーナーに質問してみる...')
          }
          placeholderTextColor={isQuotaExhausted ? Theme.colors.danger : Theme.colors.textMuted}
          editable={!isQuotaExhausted && !loading}
          multiline={true}
          maxLength={500}
        />
        <TouchableOpacity
          style={[
            styles.sendBtn,
            (inputVal.trim() === '' || isQuotaExhausted || loading) && styles.sendBtnDisabled,
          ]}
          onPress={() => handleSend()}
          disabled={inputVal.trim() === '' || isQuotaExhausted || loading}
          activeOpacity={0.7}
        >
          <Ionicons name="send" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  
  // Warning Banner
  warningBanner: {
    backgroundColor: Theme.colors.danger,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  warningText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },

  // Context Linked Badge
  contextBadge: {
    backgroundColor: 'rgba(79, 172, 254, 0.1)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(79, 172, 254, 0.2)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  contextBadgeText: { color: Theme.colors.primary, fontSize: 13, fontWeight: 'bold' },
  clearContextBtn: { padding: 2 },

  // Chat Area
  chatArea: { flex: 1 },
  chatContent: { padding: Theme.spacing.md, paddingBottom: 24 },
  
  // Bubble Containers
  bubbleContainer: { flexDirection: 'row', width: '100%', marginBottom: 16 },
  bubbleRight: { justifyContent: 'flex-end' },
  bubbleLeft: { justifyContent: 'flex-start' },

  // Chat Bubbles
  bubble: {
    maxWidth: '82%',
    borderRadius: Theme.borderRadius.md,
    paddingVertical: 12,
    paddingHorizontal: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  bubbleUser: {
    backgroundColor: Theme.colors.primary,
    borderBottomRightRadius: 2,
  },
  bubbleAI: {
    backgroundColor: Theme.colors.card,
    borderBottomLeftRadius: 2,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    paddingLeft: 20, // offset for left side vertical accent bar
  },
  aiSideAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: Theme.colors.primary,
  },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  bubbleTextUser: { color: '#fff' },
  bubbleTextAI: { color: Theme.colors.text },

  // System Message Bubble
  systemBubble: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    padding: 10,
    marginVertical: 12,
    alignItems: 'center',
  },
  systemBubbleText: { color: Theme.colors.textMuted, fontSize: 12, textAlign: 'center', lineHeight: 18 },

  // Loading Bubble
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  loadingText: { color: Theme.colors.textMuted, fontSize: 14 },

  // Suggestions Chips
  chipsOuter: { backgroundColor: Theme.colors.background, paddingVertical: 8 },
  chipsContainer: { paddingHorizontal: Theme.spacing.md, gap: 8 },
  chip: {
    backgroundColor: '#1c1c1e',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  chipText: { color: Theme.colors.text, fontSize: 13, fontWeight: '600' },

  // Footer Input Form
  inputForm: {
    flexDirection: 'row',
    padding: Theme.spacing.md,
    backgroundColor: Theme.colors.card,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
    alignItems: 'center',
    gap: 12,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#121212',
    color: Theme.colors.text,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    fontSize: 15,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    maxHeight: 100,
  },
  textInputDisabled: {
    backgroundColor: 'rgba(239, 83, 80, 0.05)',
    borderColor: Theme.colors.danger,
    color: Theme.colors.danger,
  },
  sendBtn: {
    backgroundColor: Theme.colors.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#222',
    opacity: 0.5,
  },
  
  // Maintenance styles
  maintenanceContainer: {
    flex: 1,
    backgroundColor: Theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.spacing.lg,
  },
  maintenanceCard: {
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(79, 172, 254, 0.2)',
    padding: 28,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  maintenanceIconOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(79, 172, 254, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(79, 172, 254, 0.2)',
  },
  maintenanceHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Theme.colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  maintenanceBody: {
    fontSize: 14,
    lineHeight: 22,
    color: Theme.colors.textMuted,
    textAlign: 'center',
    marginBottom: 14,
  },
  maintenanceFooter: {
    fontSize: 13,
    lineHeight: 20,
    color: Theme.colors.primary,
    fontWeight: '600',
    textAlign: 'center',
  },
});
