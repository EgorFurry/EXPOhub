import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export const Colors = {
  // Основные
  primary:        '#C41230',
  primaryDark:    '#8B0000',
  primaryLight:   'rgba(196, 18, 48, 0.15)',
  primaryBorder:  'rgba(196, 18, 48, 0.4)',
  primaryGlow:    'rgba(196, 18, 48, 0.08)',

  // Фоны
  background:     '#0B0B12',
  backgroundAlt:  '#13131f',
  surface:        'rgba(255, 255, 255, 0.05)',
  surfaceHover:   'rgba(255, 255, 255, 0.08)',

  // Бордюры
  border:         'rgba(255, 255, 255, 0.08)',
  borderLight:    'rgba(255, 255, 255, 0.12)',

  // Текст
  textPrimary:    '#FFFFFF',
  textSecondary:  'rgba(255, 255, 255, 0.6)',
  textMuted:      'rgba(255, 255, 255, 0.35)',
  textDisabled:   'rgba(255, 255, 255, 0.2)',

  // Статусы
  success:        '#4CAF50',
  warning:        '#FF9800',
  danger:         '#E74C3C',

  // Tab bar
  tabBar:         'rgba(8, 8, 14, 0.97)',
  tabActive:      '#C41230',
  tabInactive:    'rgba(255, 255, 255, 0.28)',
} as const;

export const Font = {
  xs:   11,
  sm:   13,
  md:   16,
  lg:   20,
  xl:   28,
  xxl:  36,
  hero: 52,
} as const;

export const Radius = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   24,
  full: 999,
} as const;

export const Shadow = {
  primary: {
    shadowColor: '#C41230',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 6,
  },
  soft: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
} as const;

export const Screen = { width, height } as const;