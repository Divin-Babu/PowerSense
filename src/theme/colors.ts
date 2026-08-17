export const colors = {
  // Primary Brand (Emerald / Mint)
  primary: '#00C48C',
  primaryDark: '#009668',
  primaryGradientStart: '#00D589',
  primaryGradientEnd: '#00A86B',
  primaryLight: '#E8FBF4',
  primaryMuted: '#A7F3D0',

  // Light Theme Surfaces (Soft Mint Sage background)
  background: '#EDF5F1',
  card: '#FFFFFF',
  cardBorder: '#DCE8E2',
  cardMuted: '#E2EEE8',

  // Dark Theme Surfaces
  darkBackground: '#0B0F14',
  darkCard: '#161D26',
  darkCardBorder: '#232D3B',
  darkSurface: '#1F2937',

  // Typography & Content Colors (Light Mode)
  text: '#111827',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  textLight: '#FFFFFF',

  // Typography & Content Colors (Dark Mode)
  darkText: '#F8FAFC',
  darkTextSecondary: '#94A3B8',
  darkTextMuted: '#64748B',

  // Status & Chart Accents
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',
  purple: '#8B5CF6',
  yellow: '#FBBF24',

  // Cyber / Backward Compatibility Tokens
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
} as const;

export default colors;
export type ColorKeys = keyof typeof colors;
