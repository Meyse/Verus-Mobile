import React from 'react';
import {Button} from 'react-native-paper';
import Colors from '../globals/colors';
import {appButtonStyles as styles} from '../styles';
import {
  resolveAppTheme,
  useAppTheme,
} from '../theme/app';
import {APP_BUTTON_HEIGHT} from '../styles/components/appButton.styles';

const TONAL_ON_DARK_COLOR = 'rgba(255, 255, 255, 0.16)';
const DISABLED_BUTTON_COLOR = '#E4E8EF';
const DISABLED_TEXT_COLOR = '#9AA3AF';

const createVariantStyles = theme => ({
  primary: {
    buttonColor: theme.colors.primary,
    textColor: theme.colors.onPrimary,
  },
  secondary: {
    buttonColor: theme.isDark ? theme.colors.surfaceMuted : '#EEF2F8',
    textColor: theme.isDark ? theme.colors.textPrimary : theme.colors.primary,
  },
  tonal: {
    buttonColor: theme.isDark
      ? theme.colors.surfaceMuted
      : TONAL_ON_DARK_COLOR,
    textColor: theme.isDark ? theme.colors.textPrimary : Colors.secondaryColor,
  },
  text: {
    buttonColor: 'transparent',
    textColor: theme.isDark ? theme.colors.textPrimary : theme.colors.primary,
  },
});

const createDisabledVariantStyles = theme => ({
  primary: {
    buttonColor: theme.colors.disabledButton || DISABLED_BUTTON_COLOR,
    textColor: theme.colors.disabledText || DISABLED_TEXT_COLOR,
  },
  secondary: {
    buttonColor: theme.isDark ? 'rgba(255, 255, 255, 0.08)' : '#F1F3F6',
    textColor: theme.colors.disabledText || DISABLED_TEXT_COLOR,
  },
  tonal: {
    buttonColor: theme.isDark
      ? 'rgba(255, 255, 255, 0.08)'
      : 'rgba(255, 255, 255, 0.08)',
    textColor: theme.colors.disabledText || 'rgba(255, 255, 255, 0.42)',
  },
  text: {
    buttonColor: 'transparent',
    textColor: theme.colors.disabledText || DISABLED_TEXT_COLOR,
  },
});

const AppButton = ({
  children,
  variant = 'primary',
  height = APP_BUTTON_HEIGHT,
  mode = 'text',
  uppercase = false,
  disabled = false,
  buttonColor,
  textColor,
  themeMode,
  contentStyle,
  labelStyle,
  style,
  ...props
}) => {
  const appTheme = useAppTheme();
  const theme = themeMode
    ? resolveAppTheme(themeMode)
    : appTheme;
  const variantStyles = createVariantStyles(theme);
  const disabledVariantStyles = createDisabledVariantStyles(theme);
  const variantStyle = variantStyles[variant] || variantStyles.primary;
  const disabledVariantStyle =
    disabledVariantStyles[variant] || disabledVariantStyles.primary;
  const resolvedButtonColor = disabled
    ? disabledVariantStyle.buttonColor
    : buttonColor || variantStyle.buttonColor;
  const resolvedTextColor = disabled
    ? disabledVariantStyle.textColor
    : textColor || variantStyle.textColor;

  return (
    <Button
      {...props}
      disabled={disabled}
      mode={mode}
      uppercase={uppercase}
      buttonColor={resolvedButtonColor}
      textColor={resolvedTextColor}
      contentStyle={[
        styles.content,
        {
          height,
        },
        contentStyle,
      ]}
      labelStyle={[
        styles.label,
        labelStyle,
        {
          color: resolvedTextColor,
        },
      ]}
      style={[
        styles.button,
        {
          backgroundColor: resolvedButtonColor,
        },
        style,
      ]}>
      {children}
    </Button>
  );
};

export default AppButton;
