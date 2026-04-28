import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { Stack } from 'expo-router';
import { Theme } from '../src/theme';
import { useTranslation } from 'react-i18next';

const CONTACT_EMAIL = 'trenotesupport@gmail.com';
const LAST_UPDATED_JA = '2026年4月29日';
const LAST_UPDATED_EN = 'April 29, 2026';

export default function PrivacyPolicyScreen() {
  const { i18n } = useTranslation();
  const isEn = i18n.language === 'en';

  const handleMailTo = () => {
    Linking.openURL(`mailto:${CONTACT_EMAIL}`);
  };

  if (isEn) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Privacy Policy', headerStyle: { backgroundColor: Theme.colors.background }, headerTintColor: Theme.colors.text }} />
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>Privacy Policy</Text>
          <Text style={styles.updated}>Last updated: {LAST_UPDATED_EN}</Text>

          <Section title="Overview">
            TreNote ("the App") is a personal workout tracking application. This Privacy Policy explains what information we collect, how we use it, and your rights.
          </Section>

          <Section title="Information We Collect">
            The App stores the following data <Text style={styles.bold}>only on your device</Text>:{'\n\n'}
            • Workout history (exercises, sets, reps, weight, RPE){'\n'}
            • App settings (language, rest timer preferences){'\n\n'}
            <Text style={styles.bold}>We do NOT collect any of the following:</Text>{'\n'}
            • Personal identification information (name, age, email, etc.){'\n'}
            • Location data{'\n'}
            • Health data synced to any server{'\n'}
            • Advertising identifiers or usage analytics
          </Section>

          <Section title="Data Storage">
            All data is stored locally in an SQLite database on your device. No data is transmitted to external servers or third parties. Uninstalling the App will permanently delete all locally stored data.
          </Section>

          <Section title="Notifications">
            The App requests permission to send local notifications solely to alert you when your rest interval timer completes. No notification data is collected or transmitted.
          </Section>

          <Section title="Third-Party Services">
            The App does not use any third-party analytics, advertising SDKs, or data services. No data is shared with third parties.
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

          <TouchableOpacity onPress={handleMailTo} style={styles.emailBtn}>
            <Text style={styles.emailText}>{CONTACT_EMAIL}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // Japanese version
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'プライバシーポリシー', headerStyle: { backgroundColor: Theme.colors.background }, headerTintColor: Theme.colors.text }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>プライバシーポリシー</Text>
        <Text style={styles.updated}>最終更新日: {LAST_UPDATED_JA}</Text>

        <Section title="はじめに">
          トレノート（以下「本アプリ」）は、個人のトレーニングを記録するためのアプリです。本プライバシーポリシーは、本アプリが収集する情報の種類、利用目的、およびお客様の権利について説明します。
        </Section>

        <Section title="収集する情報">
          本アプリは、以下のデータを<Text style={styles.bold}>お客様のデバイス内にのみ</Text>保存します:{'\n\n'}
          • トレーニング記録（種目名、セット数、回数、重量、RPEなど）{'\n'}
          • アプリの設定（言語設定、インターバルタイマーの設定）{'\n\n'}
          <Text style={styles.bold}>以下の情報は一切収集しません：</Text>{'\n'}
          • 氏名・年齢・メールアドレスなどの個人を特定できる情報{'\n'}
          • 位置情報{'\n'}
          • サーバーへ送信される運動・健康データ{'\n'}
          • 広告識別子・利用状況の分析データ
        </Section>

        <Section title="データの保存場所">
          すべてのデータは、お客様のデバイス内のSQLiteデータベースにローカル保存されます。外部サーバーや第三者にデータが送信されることはありません。アプリをアンインストールすると、保存されたすべてのデータが完全に削除されます。
        </Section>

        <Section title="通知機能">
          本アプリは、インターバルタイマーの終了をお知らせするために、ローカル通知の許可を求めます。通知に関するデータの収集・送信は一切行いません。
        </Section>

        <Section title="第三者への提供">
          本アプリは、第三者向けの分析・広告SDKを一切使用しておらず、お客様のデータを第三者に提供することはありません。
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

        <TouchableOpacity onPress={handleMailTo} style={styles.emailBtn}>
          <Text style={styles.emailText}>{CONTACT_EMAIL}</Text>
        </TouchableOpacity>
      </ScrollView>
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
});

const sectionStyles = StyleSheet.create({
  container: { marginBottom: 24 },
  title: { fontSize: 16, fontWeight: 'bold', color: Theme.colors.primary, marginBottom: 8 },
  body: { fontSize: 14, color: Theme.colors.textMuted, lineHeight: 22 },
});
