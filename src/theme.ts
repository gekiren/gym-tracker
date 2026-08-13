import { useSettingsStore } from './store/settingsStore';

export type BackgroundThemeMode = 'dark' | 'pureBlack';

export const getThemeColors = (mode: BackgroundThemeMode = 'dark') => {
  if (mode === 'pureBlack') {
    return {
      background: '#000000',
      card: '#080808',
      primary: '#4facfe',
      text: '#b0b0b0',
      textMuted: '#808080',
      border: '#1f1f1f',
      success: '#4cd964',
      danger: '#ff3b30'
    };
  }
  return {
    background: '#121212',
    card: '#1e1e1e',
    primary: '#4facfe',
    text: '#c0c0c0',
    textMuted: '#888888',
    border: '#333333',
    success: '#4cd964',
    danger: '#ff3b30'
  };
};

export const Theme = {
  get colors() {
    try {
      const backgroundTheme = useSettingsStore.getState?.()?.settings?.backgroundTheme || 'dark';
      return getThemeColors(backgroundTheme);
    } catch {
      return getThemeColors('dark');
    }
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
  }
};

export const useAppTheme = () => {
  const backgroundTheme = useSettingsStore((state) => state.settings.backgroundTheme);
  const colors = getThemeColors(backgroundTheme);
  return {
    colors,
    backgroundTheme,
    spacing: Theme.spacing,
    borderRadius: Theme.borderRadius,
  };
};
