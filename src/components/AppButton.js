import React from 'react';
import {Button, TouchableRipple} from 'react-native-paper';
import Colors from '../globals/colors';
import {appButtonStyles as styles} from '../styles';
import {
  resolveAppTheme,
  useAppTheme,
} from '../theme/app';
import {APP_BUTTON_HEIGHT} from '../styles/components/appButton.styles';
import {getButtonHitSlop, useButtonHeight} from '../hooks/useButtonHeight';

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
  hitSlop,
  ...props
}) => {
  const appTheme = useAppTheme();
  const buttonHeight = useButtonHeight(variant, height);
  const compactAction = buttonHeight < 48 &&
    (variant === 'primary' || variant === 'secondary');
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

  const button = (
    <Button
      {...props}
      {...(compactAction ? {
        onPress: undefined,
        onPressIn: undefined,
        onPressOut: undefined,
        onLongPress: undefined,
        onLayout: undefined,
        accessible: false,
        pointerEvents: 'none',
        testID: props.testID ? `${props.testID}.visual` : undefined,
      } : {})}
      hitSlop={hitSlop}
      disabled={disabled}
      mode={mode}
      uppercase={uppercase}
      buttonColor={resolvedButtonColor}
      textColor={resolvedTextColor}
      contentStyle={[
        styles.content,
        {
          height: buttonHeight,
        },
        contentStyle,
        compactAction && {height: buttonHeight, minHeight: buttonHeight},
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
        !compactAction && style,
      ]}>
      {children}
    </Button>
  );

  if (!compactAction) return button;

  // Paper Button forwards hitSlop to Surface, not its touchable. Keep its
  // visuals and put the compact action on a ripple with a real 48-point target.
  return (
    <TouchableRipple
      accessible={props.accessible}
      accessibilityLabel={props.accessibilityLabel}
      accessibilityHint={props.accessibilityHint}
      accessibilityRole={props.accessibilityRole || 'button'}
      accessibilityState={{...props.accessibilityState, disabled}}
      disabled={disabled}
      hitSlop={getButtonHitSlop(buttonHeight, hitSlop)}
      onPress={props.onPress}
      onPressIn={props.onPressIn}
      onPressOut={props.onPressOut}
      onLongPress={props.onLongPress}
      delayLongPress={props.delayLongPress}
      onLayout={props.onLayout}
      rippleColor={props.rippleColor}
      testID={props.testID}
      style={[styles.button, style, {height: buttonHeight, minHeight: buttonHeight}]}>
      {button}
    </TouchableRipple>
  );
};

export default AppButton;
