import React, { useState, useEffect } from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../src/theme';

interface TimerButtonProps {
  onTimeCapture: (secs: number) => void;
}

export function TimerButton({ onTimeCapture }: TimerButtonProps) {
  const { colors } = useAppTheme();
  const [isActive, setIsActive] = useState(false);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    let interval: any = null;
    if (isActive) {
      interval = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } else if (!isActive && seconds !== 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isActive, seconds]);

  const handlePress = () => {
    if (isActive) {
      // Stop and capture
      onTimeCapture(seconds);
      setIsActive(false);
      setSeconds(0);
    } else {
      // Start
      setSeconds(0);
      setIsActive(true);
    }
  };

  return (
    <TouchableOpacity 
      style={[
        styles.timerInputBtn, 
        isActive && { backgroundColor: colors.danger }
      ]} 
      onPress={handlePress}
    >
      {isActive ? (
        <Text style={styles.timerInputBtnText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{seconds}s</Text>
      ) : (
        <Ionicons name="play" size={16} color={colors.text} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  timerInputBtn: {
    width: 32,
    marginHorizontal: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 6,
    paddingVertical: 0,
    alignItems: 'center',
    justifyContent: 'center',
    height: 30
  },
  timerInputBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold'
  }
});
