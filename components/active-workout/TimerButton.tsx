import React, { useState, useEffect } from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../../src/theme';

interface TimerButtonProps {
  onTimeCapture: (secs: number) => void;
}

export function TimerButton({ onTimeCapture }: TimerButtonProps) {
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
        isActive && { backgroundColor: Theme.colors.danger }
      ]} 
      onPress={handlePress}
    >
      {isActive ? (
        <Text style={styles.timerInputBtnText}>{seconds}s</Text>
      ) : (
        <Ionicons name="play" size={16} color="#fff" />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  timerInputBtn: {
    width: 55,
    marginHorizontal: 3,
    backgroundColor: '#333',
    borderRadius: 4,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    height: 32
  },
  timerInputBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold'
  }
});
