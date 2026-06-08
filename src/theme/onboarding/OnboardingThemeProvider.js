import React, {createContext, useMemo} from 'react';
import {useColorScheme} from 'react-native';
import {
  ONBOARDING_THEME_MODE,
  ONBOARDING_THEMES,
  resolveOnboardingTheme,
} from './tokens';

export const OnboardingThemeContext = createContext(ONBOARDING_THEMES.light);

const normalizeMode = mode => {
  if (mode === ONBOARDING_THEME_MODE.DARK) return ONBOARDING_THEME_MODE.DARK;
  if (mode === ONBOARDING_THEME_MODE.LIGHT) return ONBOARDING_THEME_MODE.LIGHT;

  return null;
};

const OnboardingThemeProvider = ({children, modeOverride}) => {
  const systemColorScheme = useColorScheme();
  const mode = normalizeMode(modeOverride) || normalizeMode(systemColorScheme);
  const theme = useMemo(
    () => resolveOnboardingTheme(mode || ONBOARDING_THEME_MODE.LIGHT),
    [mode],
  );

  return (
    <OnboardingThemeContext.Provider value={theme}>
      {children}
    </OnboardingThemeContext.Provider>
  );
};

export default OnboardingThemeProvider;
