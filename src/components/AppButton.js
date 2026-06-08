import React from 'react';
import {Button} from 'react-native-paper';
import Colors from '../globals/colors';
import {appButtonStyles as styles} from '../styles';

const TONAL_ON_DARK_COLOR = 'rgba(255, 255, 255, 0.16)';
const DISABLED_BUTTON_COLOR = '#E4E8EF';
const DISABLED_TEXT_COLOR = '#9AA3AF';

const variantStyles = {
  primary: {
    buttonColor: Colors.primaryColor,
    textColor: Colors.secondaryColor,
  },
  secondary: {
    buttonColor: '#EEF2F8',
    textColor: Colors.primaryColor,
  },
  tonal: {
    buttonColor: TONAL_ON_DARK_COLOR,
    textColor: Colors.secondaryColor,
  },
  text: {
    buttonColor: 'transparent',
    textColor: Colors.primaryColor,
  },
};

const disabledVariantStyles = {
  primary: {
    buttonColor: DISABLED_BUTTON_COLOR,
    textColor: DISABLED_TEXT_COLOR,
  },
  secondary: {
    buttonColor: '#F1F3F6',
    textColor: DISABLED_TEXT_COLOR,
  },
  tonal: {
    buttonColor: 'rgba(255, 255, 255, 0.08)',
    textColor: 'rgba(255, 255, 255, 0.42)',
  },
  text: {
    buttonColor: 'transparent',
    textColor: DISABLED_TEXT_COLOR,
  },
};

const AppButton = ({
  children,
  variant = 'primary',
  height = 56,
  mode = 'text',
  uppercase = false,
  disabled = false,
  buttonColor,
  textColor,
  contentStyle,
  labelStyle,
  style,
  ...props
}) => {
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
        disabled && {
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
