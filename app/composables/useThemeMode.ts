export const THEME_MODES = ['light', 'dark', 'system'] as const
export type ThemeMode = typeof THEME_MODES[number]

export function useThemeMode(initialMode: ThemeMode = 'system') {
  return useState<ThemeMode>('site-theme-mode', () => initialMode)
}
