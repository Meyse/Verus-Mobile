import {fontStyle} from '../../globals/fonts';

export const ONBOARDING_THEME_MODE = {
  LIGHT: 'light',
  DARK: 'dark',
};

const shared = {
  spacing: {
    xxs: 2,
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    screenPadding: 32,
    sheetPadding: 20,
    bottomActionMin: 30,
  },
  rounded: {
    sm: 8,
    md: 12,
    lg: 18,
    xl: 24,
    full: 9999,
  },
  typography: {
    headlineLg: {
      fontSize: 31,
      lineHeight: 38,
      ...fontStyle('semiBold'),
    },
    headlineMd: {
      fontSize: 28,
      lineHeight: 36,
      ...fontStyle('semiBold'),
    },
    titleSheet: {
      fontSize: 20,
      lineHeight: 26,
      ...fontStyle('semiBold'),
    },
    bodyMd: {
      fontSize: 16,
      lineHeight: 24,
      ...fontStyle('regular'),
    },
    inputValue: {
      fontSize: 17,
      lineHeight: 24,
      ...fontStyle('regular'),
    },
    labelMd: {
      fontSize: 14,
      lineHeight: 19,
      ...fontStyle('semiBold'),
    },
    caption: {
      fontSize: 13,
      lineHeight: 18,
      ...fontStyle('regular'),
    },
  },
};

const lightColors = {
  primary: '#3165D4',
  primaryPressed: '#2854B4',
  onPrimary: '#FFFFFF',
  background: '#FFFFFF',
  backgroundVideo: '#F7FAFF',
  surface: '#FFFFFF',
  surfaceRaised: '#FBFCFE',
  surfaceMuted: '#F3F5F8',
  walletCard: 'rgba(255, 255, 255, 0.82)',
  textPrimary: '#111827',
  textSecondary: '#4B5565',
  textSubtle: '#8E939B',
  border: '#E7ECF2',
  borderStrong: '#D6DEE9',
  input: '#F3F5F8',
  inputFocused: '#FFFFFF',
  sheet: '#FFFFFF',
  scrim: '#000000',
  scrimOpacity: 0.6,
  videoVeil: 'rgba(255, 255, 255, 0.42)',
  successBackground: '#EEF7F0',
  success: '#4AA658',
  warning: '#F89336',
  danger: '#F22D37',
  disabledButton: '#E4E8EF',
  disabledText: '#9AA3AF',
  shadow: '#000000',
  star: '#F7B500',
};

const darkColors = {
  primary: '#3165D4',
  primaryPressed: '#2854B4',
  onPrimary: '#FFFFFF',
  background: '#07111F',
  backgroundVideo: '#07111F',
  surface: '#101D2F',
  surfaceRaised: '#17253A',
  surfaceMuted: '#1D314D',
  walletCard: 'rgba(16, 29, 47, 0.90)',
  textPrimary: '#F4F7FB',
  textSecondary: '#A9B6CA',
  textSubtle: '#7E8EA6',
  border: '#263A58',
  borderStrong: '#38527A',
  input: '#111F31',
  inputFocused: '#07111F',
  sheet: '#0F1B2C',
  scrim: '#000000',
  scrimOpacity: 0.66,
  videoVeil: 'rgba(3, 8, 18, 0.66)',
  successBackground: 'rgba(100, 200, 117, 0.18)',
  success: '#64C875',
  warning: '#FFB25C',
  danger: '#FF6B75',
  disabledButton: 'rgba(255, 255, 255, 0.08)',
  disabledText: 'rgba(255, 255, 255, 0.42)',
  shadow: '#000000',
  star: '#F7B500',
};

export const ONBOARDING_THEMES = {
  light: {
    mode: ONBOARDING_THEME_MODE.LIGHT,
    isDark: false,
    colors: lightColors,
    ...shared,
  },
  dark: {
    mode: ONBOARDING_THEME_MODE.DARK,
    isDark: true,
    colors: darkColors,
    ...shared,
  },
};

export const resolveOnboardingTheme = mode =>
  mode === ONBOARDING_THEME_MODE.DARK
    ? ONBOARDING_THEMES.dark
    : ONBOARDING_THEMES.light;
