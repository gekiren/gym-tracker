import React, { useEffect, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';

const COLORS = [
  '#FFC107', // Amber
  '#FF5722', // Deep Orange
  '#E91E63', // Pink
  '#9C27B0', // Purple
  '#3F51B5', // Indigo
  '#00BCD4', // Cyan
  '#4CAF50', // Green
  '#8BC34A', // Light Green
  '#FF3D00', // Red/Orange
  '#00E676', // Bright Green
  '#2979FF', // Bright Blue
];

interface Particle {
  id: number;
  startX: number;
  endX: number;
  startY: number;
  endY: number;
  size: number;
  color: string;
  isCircle: boolean;
  delay: number;
  duration: number;
  rotationStart: number;
  rotationEnd: number;
  swayFreq: number;
  swayAmp: number;
}

export const Confetti = () => {
  const { width, height } = useWindowDimensions();
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const tempParticles: Particle[] = [];
    const count = 75; // Number of particles

    for (let i = 0; i < count; i++) {
      const startX = Math.random() * width;
      const drift = Math.random() * 120 - 60; // horizontal drift amount
      const startY = -Math.random() * 120 - 30; // start offset above screen
      const endY = height + 40;
      const size = Math.random() * 8 + 6; // width/height base
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      const isCircle = Math.random() > 0.4;
      const delay = Math.random() * 1200; // staggered spawn delays up to 1.2s
      const duration = Math.random() * 2500 + 2000; // time to fall (2s to 4.5s)
      const rotationStart = Math.random() * 360;
      const rotationEnd = rotationStart + Math.random() * 720 - 360;
      const swayFreq = Math.random() * 8 + 4; // sway frequency (sin wave)
      const swayAmp = Math.random() * 20 + 10; // sway amplitude (pixels)

      tempParticles.push({
        id: i,
        startX,
        endX: startX + drift,
        startY,
        endY,
        size,
        color,
        isCircle,
        delay,
        duration,
        rotationStart,
        rotationEnd,
        swayFreq,
        swayAmp,
      });
    }

    setParticles(tempParticles);
  }, [width, height]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((p) => (
        <ConfettiParticle key={p.id} particle={p} />
      ))}
    </View>
  );
};

const ConfettiParticle = ({ particle }: { particle: Particle }) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      particle.delay,
      withTiming(1, {
        duration: particle.duration,
        easing: Easing.linear,
      })
    );
  }, [particle]);

  const animatedStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const y = particle.startY + p * (particle.endY - particle.startY);
    const x = particle.startX + p * (particle.endX - particle.startX) + Math.sin(p * particle.swayFreq) * particle.swayAmp;
    const rotate = `${particle.rotationStart + p * (particle.rotationEnd - particle.rotationStart)}deg`;
    const opacity = p > 0.85 ? 1 - (p - 0.85) / 0.15 : 1; // fade out near bottom

    return {
      position: 'absolute',
      left: x,
      top: y,
      width: particle.size,
      height: particle.isCircle ? particle.size : particle.size * 1.5,
      borderRadius: particle.isCircle ? particle.size / 2 : 2,
      backgroundColor: particle.color,
      transform: [
        { rotateX: rotate },
        { rotateY: rotate },
        { rotateZ: rotate },
      ],
      opacity,
    };
  });

  return <Animated.View style={animatedStyle} />;
};
