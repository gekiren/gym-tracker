import React, { useState, useEffect } from 'react';
import { Text } from 'react-native';

interface ElapsedTimerHeaderProps {
  startTime: string | null;
  style?: any;
}

export function ElapsedTimerHeader({ startTime, style }: ElapsedTimerHeaderProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startTime) return;
    const startOffset = new Date(startTime).getTime();
    const iv = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startOffset) / 1000));
    }, 1000);
    return () => clearInterval(iv);
  }, [startTime]);

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return <Text style={style}>{formatTime(elapsed)}</Text>;
}
