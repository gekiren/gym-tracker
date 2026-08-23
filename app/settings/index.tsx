import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Theme } from '../../src/theme';
import { useProfile } from '../../src/hooks/useProfile';
import { ProfileMenuCard } from '../../components/profile/ProfileMenuCard';
import { PaywallModal } from '../../components/active-workout/PaywallModal';

export default function SettingsScreen() {
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
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color={Theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>アプリ設定</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.menuGrid}>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/settings/widget-launcher')}>
            <View style={styles.menuIconContainer}>
              <Ionicons name="apps" size={24} color={Theme.colors.primary} />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>ウィジェット設定</Text>
              <Text style={styles.menuDesc}>クイックランチャーの項目をカスタマイズ</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Theme.colors.textMuted} />
          </TouchableOpacity>

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.md,
    paddingTop: 54,
    paddingBottom: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: Theme.colors.text },
  content: { padding: Theme.spacing.md, paddingBottom: 60 },
  menuGrid: { gap: Theme.spacing.md },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.card,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(79, 172, 254, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    color: Theme.colors.text,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  menuDesc: {
    color: Theme.colors.textMuted,
    fontSize: 12,
  },
});
