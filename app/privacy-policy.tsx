import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Modal, TextInput, TouchableWithoutFeedback } from 'react-native';
import { Stack, router } from 'expo-router';
import { Theme } from '../src/theme';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';

const CONTACT_EMAIL = 'trenotesupport@gmail.com';
const LAST_UPDATED_JA = '2026年6月4日';
const LAST_UPDATED_EN = 'June 4, 2026';

export default function PrivacyPolicyScreen() {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === 'en';

  const [tapCount, setTapCount] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleMailTo = () => {
    Linking.openURL(`mailto:${CONTACT_EMAIL}`);
  };

  const handleTap = () => {
    setTapCount(prev => {
      const next = prev + 1;
      if (next >= 5) {
        setModalVisible(true);
        setPasscode('');
        setErrorMsg('');
        return 0; // reset count after trigger
      }
      return next;
    });
  };

  const handleVerify = () => {
    if (passcode === 'gekiren') {
      setModalVisible(false);
      setPasscode('');
      setErrorMsg('');
      router.push('/developer-menu' as any);
    } else {
      setErrorMsg(t('ui.developer_menu.secret_error'));
    }
  };

  const handleCancel = () => {
    setModalVisible(false);
    setPasscode('');
    setErrorMsg('');
    setTapCount(0);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: isEn ? 'Privacy Policy' : 'プライバシーポリシー', headerStyle: { backgroundColor: Theme.colors.background }, headerTintColor: Theme.colors.text }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{isEn ? 'Privacy Policy' : 'プライバシーポリシー'}</Text>
        <Text style={styles.updated}>{isEn ? `Last updated: ${LAST_UPDATED_EN}` : `最終更新日: ${LAST_UPDATED_JA}`}</Text>

        {isEn ? (
          <>
            <Section title="Overview">
              TreNote ("the App") is a personal workout tracking application. This Privacy Policy explains what information we collect, how we use it, and your rights.
            </Section>

            <Section title="Information We Collect">
              The App stores the following data <Text style={styles.bold}>only on your device</Text>:{'\n\n'}
              • Workout history (exercises, sets, reps, weight, RPE){'\n'}
              • App settings (language, rest timer preferences){'\n\n'}
              <Text style={styles.bold}>We also collect the following anonymous diagnostics (only with your explicit consent):</Text>{'\n'}
              • Anonymous crash logs (error message, stack trace, timestamp) to help improve app quality.{'\n\n'}
              <Text style={styles.bold}>We do NOT collect any of the following:</Text>{'\n'}
              • Personal identification information (name, age, email, etc.){'\n'}
              • Location data{'\n'}
              • Health data synced to any server{'\n'}
              • Advertising identifiers or usage analytics
            </Section>

            <TouchableOpacity activeOpacity={1} onPress={handleTap}>
              <Section title="Data Storage">
                All data is stored locally in an SQLite database on your device. No data is transmitted to external servers or third parties. Uninstalling the App will permanently delete all locally stored data.
              </Section>
            </TouchableOpacity>

            <Section title="Notifications">
              The App requests permission to send local notifications solely to alert you when your rest interval timer completes. No notification data is collected or transmitted.
            </Section>

            <Section title="Third-Party Services">
              With your consent, the App transmits anonymous crash logs to diagnostic platforms (e.g. Sentry / Firebase Crashlytics) to help debug issues. Aside from these anonymous diagnostic services, the App does not use any advertising SDKs or share your data with other third parties.
            </Section>

            <Section title="Children's Privacy">
              The App is not directed at children under 13. We do not knowingly collect any personal information from children.
            </Section>

            <Section title="Changes to This Policy">
              We may update this Privacy Policy from time to time. Changes will be reflected in the "Last updated" date above.
            </Section>

            <Section title="Contact">
              If you have any questions about this Privacy Policy, please contact us:
            </Section>
          </>
        ) : (
          <>
            <Section title="はじめに">
              トレノート（以下「本アプリ」）は、個人のトレーニングを記録するためのアプリです。本プライバシーポリシーは、本アプリが収集する情報の種類、利用目的、およびお客様の権利について説明します。
            </Section>

            <Section title="収集する情報">
              本アプリは、以下のデータを<Text style={styles.bold}>お客様のデバイス内にのみ</Text>保存します:{'\n\n'}
              • トレーニング記録（種目名、セット数、回数、重量、RPEなど）{'\n'}
              • アプリの設定（言語設定、インターバルタイマーの設定）{'\n\n'}
              <Text style={styles.bold}>また、お客様の明示的な同意がある場合に限り、以下のデータを匿名で収集します：</Text>{'\n'}
              • 匿名のクラッシュ診断レポート（エラーメッセージ、スタックトレース、発生日時などの動作ログ）。これはアプリの不具合修正にのみ利用されます。{'\n\n'}
              <Text style={styles.bold}>以下の情報は一切収集しません：</Text>{'\n'}
              • 氏名・年齢・メールアドレスなどの個人を特定できる情報{'\n'}
              • 位置情報{'\n'}
              • サーバーへ送信される運動・健康データ{'\n'}
              • 広告識別子・利用状況の分析データ
            </Section>

            <TouchableOpacity activeOpacity={1} onPress={handleTap}>
              <Section title="データの保存場所">
                すべてのデータは、お客様のデバイス内のSQLiteデータベースにローカル保存されます。外部サーバーや第三者にデータが送信されることはありません。アプリをアンインストールすると、保存されたすべてのデータが完全に削除されます。
              </Section>
            </TouchableOpacity>

            <Section title="通知機能">
              本アプリは、インターバルタイマーの終了をお知らせするために、ローカル通知の許可を求めます。通知に関するデータの収集・送信は一切行いません。
            </Section>

            <Section title="第三者への提供">
              お客様の同意のもとで、不具合の早期発見・修正を目的として、匿名のクラッシュログを解析プラットフォーム（Sentry や Firebase Crashlytics など）に送信することがあります。これ以外の広告SDKやサードパーティサービスへのデータ提供は一切行っていません。
            </Section>

            <Section title="お子様のプライバシー">
              本アプリは13歳未満のお子様を対象としていません。13歳未満のお子様の個人情報を故意に収集することはありません。
            </Section>

            <Section title="本ポリシーの変更">
              本プライバシーポリシーは将来変更される場合があります。変更があった場合は、上記の「最終更新日」を更新します。
            </Section>

            <Section title="お問い合わせ">
              本プライバシーポリシーに関するご質問は、以下の連絡先までお問い合わせください:
            </Section>
          </>
        )}

        <TouchableOpacity onPress={handleMailTo} style={styles.emailBtn}>
          <Text style={styles.emailText}>{CONTACT_EMAIL}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Secret Passcode Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancel}
      >
        <TouchableWithoutFeedback onPress={handleCancel}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContainer}>
                <Text style={styles.modalTitle}>{t('ui.developer_menu.secret_modal_title')}</Text>
                <Text style={styles.modalDesc}>{t('ui.developer_menu.secret_modal_desc')}</Text>
                
                <TextInput
                  style={styles.modalInput}
                  value={passcode}
                  onChangeText={setPasscode}
                  placeholder={t('ui.developer_menu.secret_placeholder')}
                  placeholderTextColor={Theme.colors.textMuted}
                  secureTextEntry={true}
                  autoFocus={true}
                  autoCapitalize="none"
                  onSubmitEditing={handleVerify}
                />
                
                {errorMsg ? <Text style={styles.modalError}>{errorMsg}</Text> : null}
                
                <View style={styles.modalButtons}>
                  <TouchableOpacity onPress={handleCancel} style={[styles.modalBtn, styles.modalBtnCancel]}>
                    <Text style={styles.modalBtnTextCancel}>{t('ui.developer_menu.secret_cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleVerify} style={[styles.modalBtn, styles.modalBtnSubmit]}>
                    <Text style={styles.modalBtnTextSubmit}>{t('ui.developer_menu.secret_submit')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={sectionStyles.container}>
      <Text style={sectionStyles.title}>{title}</Text>
      <Text style={sectionStyles.body}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  content: { padding: 20, paddingBottom: 60 },
  title: { fontSize: 24, fontWeight: 'bold', color: Theme.colors.text, marginBottom: 6 },
  updated: { fontSize: 13, color: Theme.colors.textMuted, marginBottom: 24 },
  bold: { fontWeight: 'bold', color: Theme.colors.text },
  emailBtn: {
    marginTop: 8,
    padding: 14,
    backgroundColor: 'rgba(79, 172, 254, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(79, 172, 254, 0.3)',
    alignItems: 'center',
  },
  emailText: { color: Theme.colors.primary, fontSize: 15, fontWeight: '600' },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: Theme.colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    padding: 24,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Theme.colors.text,
    marginBottom: 8,
  },
  modalDesc: {
    fontSize: 14,
    color: Theme.colors.textMuted,
    textAlign: 'center',
    marginBottom: 20,
  },
  modalInput: {
    width: '100%',
    backgroundColor: '#121212',
    color: Theme.colors.text,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    fontSize: 16,
    marginBottom: 12,
    textAlign: 'center',
  },
  modalError: {
    color: '#ff4d4f',
    fontSize: 13,
    marginBottom: 12,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    width: '100%',
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnCancel: {
    backgroundColor: '#222',
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  modalBtnSubmit: {
    backgroundColor: Theme.colors.primary,
  },
  modalBtnTextCancel: {
    color: Theme.colors.textMuted,
    fontSize: 15,
    fontWeight: '600',
  },
  modalBtnTextSubmit: {
    color: '#000',
    fontSize: 15,
    fontWeight: '700',
  },
});

const sectionStyles = StyleSheet.create({
  container: { marginBottom: 24 },
  title: { fontSize: 16, fontWeight: 'bold', color: Theme.colors.primary, marginBottom: 8 },
  body: { fontSize: 14, color: Theme.colors.textMuted, lineHeight: 22 },
});
