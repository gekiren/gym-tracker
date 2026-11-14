import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAppTheme } from '../../src/theme';
import { useProfile } from '../../src/hooks/useProfile';
import { ProfileMenuCard } from '../../components/profile/ProfileMenuCard';
import { PaywallModal } from '../../components/active-workout/PaywallModal';

export default function SettingsScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

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
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>アプリ設定</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.menuGrid}>
          {menuItems.map(item => (
            <ProfileMenuCard key={item.id} item={item} onPress={handleNavigate} />
          ))}
        </View>

        {/* Paywall Modal */}
        <Modal
          visible={isPaywallVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => !isPurchasing && setIsPaywallVisible(false)}
        >
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

const createStyles = (colors: ReturnType<typeof useAppTheme>['colors']) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 54,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backButton: { padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text },
    content: { padding: 16, paddingBottom: 60 },
    menuGrid: { gap: 16 },
  });
