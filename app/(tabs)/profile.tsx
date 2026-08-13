import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Theme } from '../../src/theme';
import { WorkoutTimerSettingsContent } from '../../components/profile/WorkoutTimerSettingsContent';

export default function ProfileScreen() {
  return (
    <View style={styles.container}>
      <WorkoutTimerSettingsContent />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
});
