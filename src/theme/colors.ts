// PowerSense Universal Theme Design Tokens (Light / Dark)

export const lightTheme = {
  mode: 'light' as const,
  primary: '#00C48C',
  primaryDark: '#009668',
  primaryGradientStart: '#00D589',
  primaryGradientEnd: '#00A86B',
  primaryLight: '#E8FBF4',
  primaryMuted: '#A7F3D0',

  // Surfaces & Backgrounds
  background: '#EDF5F1',
  card: '#FFFFFF',
  cardBorder: '#DCE8E2',
  cardMuted: '#E2EEE8',
  subCardBg: '#F8FAF9',
  subCardBorder: '#E5E9E7',
  modalBg: '#FFFFFF',
  modalOverlay: 'rgba(15, 23, 42, 0.6)',

  // Typography
  text: '#111827',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  textLight: '#FFFFFF',

  // Inputs
  inputBg: '#F8FAF9',
  inputBorder: '#E5E9E7',
  inputFocusBorder: '#00C48C',

  // Badges & Accents
  logoBadgeBg: '#E8FBF4',
  logoBadgeBorder: '#C5F0E1',
  pillBg: '#F1F5F3',
  pillBorder: '#E2EEE8',
  headerBg: '#EDF5F1',

  // Navigation
  tabBarBg: '#FFFFFF',
  tabBarBorder: '#E5E9E7',
  tabBarActive: '#00C48C',
  tabBarInactive: '#64748B',

  // Status Colors
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',
  purple: '#8B5CF6',
  yellow: '#FBBF24',

  // Compatibility Tokens
  spaceVoid: '#EDF5F1',
  obsidian: '#FFFFFF',
  obsidianLight: '#FFFFFF',
  obsidianCard: '#FFFFFF',
  cyberCyan: '#00C48C',
  cyberEmerald: '#00D589',
  cyberAmber: '#F59E0B',
  cyberCrimson: '#EF4444',
  onSurface: '#111827',
  onSurfaceVariant: '#64748B',
  onSurfaceDim: '#94A3B8',
  surfaceContainerHighest: '#DCE8E2',
  surfaceContainerLowest: '#FFFFFF',
  outline: '#DCE8E2',
  outlineVariant: '#E2E8F0',
};

export const darkTheme = {
  mode: 'dark' as const,
  primary: '#00C48C',
  primaryDark: '#009668',
  primaryGradientStart: '#00D589',
  primaryGradientEnd: '#00A86B',
  primaryLight: '#0B291E',
  primaryMuted: '#065F46',

  // Surfaces & Backgrounds
  background: '#0B0F14',
  card: '#141B24',
  cardBorder: '#222C3A',
  cardMuted: '#1A2330',
  subCardBg: '#0F1620',
  subCardBorder: '#243040',
  modalBg: '#141B24',
  modalOverlay: 'rgba(0, 0, 0, 0.8)',

  // Typography
  text: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textLight: '#FFFFFF',

  // Inputs
  inputBg: '#0F1620',
  inputBorder: '#243040',
  inputFocusBorder: '#00C48C',

  // Badges & Accents
  logoBadgeBg: 'rgba(0, 196, 140, 0.14)',
  logoBadgeBorder: 'rgba(0, 196, 140, 0.35)',
  pillBg: '#17202C',
  pillBorder: '#253243',
  headerBg: '#0B0F14',

  // Navigation
  tabBarBg: '#10161F',
  tabBarBorder: '#1E2734',
  tabBarActive: '#00C48C',
  tabBarInactive: '#94A3B8',

  // Status Colors
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#38BDF8',
  purple: '#A78BFA',
  yellow: '#FBBF24',

  // Compatibility Tokens
  spaceVoid: '#0B0F14',
  obsidian: '#141B24',
  obsidianLight: '#1A2330',
  obsidianCard: '#141B24',
  cyberCyan: '#00C48C',
  cyberEmerald: '#00D589',
  cyberAmber: '#F59E0B',
  cyberCrimson: '#EF4444',
  onSurface: '#F8FAFC',
  onSurfaceVariant: '#94A3B8',
  onSurfaceDim: '#64748B',
  surfaceContainerHighest: '#222C3A',
  surfaceContainerLowest: '#10161F',
  outline: '#222C3A',
  outlineVariant: '#1E2734',
};

export type ThemeMode = 'light' | 'dark';
export type ThemePalette = typeof lightTheme & { mode: ThemeMode };

export const getThemeColors = (mode: ThemeMode): ThemePalette => {
  return (mode === 'dark' ? darkTheme : lightTheme) as ThemePalette;
};

// Default export uses light theme for backward compatibility
export const colors = lightTheme;
export default colors;
