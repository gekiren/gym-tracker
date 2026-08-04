import { View, Text, StyleSheet, ScrollView, Modal } from 'react-native';
import { useCallback } from 'react';
import { router } from 'expo-router';
import { Theme } from '../../src/theme';
import { PaywallModal } from '../../components/active-workout/PaywallModal';
import { useProfile } from '../../src/hooks/useProfile';
import { ProfileMenuCard } from '../../components/profile/ProfileMenuCard';

export default function ProfileScreen() {
  const {
    t,
    isPaywallVisible,
    setIsPaywallVisible,
    isPurchasing,
    isPremium,
    isEarly,
    menuItems,
    handlePurchase,
    handleRestore,
  } = useProfile();

  const handleNavigate = useCallback((route: string) => {
    router.push(route as any);
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('ui.profile.title') || '設定'}</Text>
        <Text style={styles.subtitle}>アプリの各種設定や連携機能を管理します</Text>
      </View>

      <View style={styles.menuGrid}>
        {menuItems.map(item => (
          <ProfileMenuCard key={item.id} item={item} onPress={handleNavigate} />
        ))}
      </View>

      {/* Paywall Modal */}
      <Modal visible={isPaywallVisible} animationType="slide" transparent={true}>
        <PaywallModal
          isPurchasing={isPurchasing}
          isPremium={isPremium}
          isEarly={isEarly}
          onClose={() => !isPurchasing && setIsPaywallVisible(false)}
          onPurchase={handlePurchase}
          onRestore={handleRestore}
          displayPrice={t('ui.profile.paywall.fallback_price')}
        />
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  content: { padding: Theme.spacing.md, paddingBottom: 100 },
  header: { marginBottom: Theme.spacing.lg, marginTop: Theme.spacing.md },
  title: { fontSize: 28, fontWeight: 'bold', color: Theme.colors.text, marginBottom: 4 },
  subtitle: { fontSize: 13, color: Theme.colors.textMuted },
  menuGrid: { gap: Theme.spacing.md },
});
