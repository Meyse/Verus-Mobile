import React from 'react';
import {StyleSheet} from 'react-native';
import {Button} from 'react-native-paper';
import Colors from '../globals/colors';
import {fontStyle} from '../globals/fonts';

const TONAL_ON_DARK_COLOR = 'rgba(255, 255, 255, 0.16)';

const variantStyles = {
  primary: {
    buttonColor: Colors.primaryColor,
    textColor: Colors.secondaryColor,
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

const AppButton = ({
  children,
  variant = 'primary',
  height = 56,
  mode = 'text',
  uppercase = false,
  buttonColor,
  textColor,
  contentStyle,
  labelStyle,
  style,
  ...props
}) => {
  const variantStyle = variantStyles[variant] || variantStyles.primary;
  const resolvedButtonColor = buttonColor || variantStyle.buttonColor;

  return (
    <Button
      {...props}
      mode={mode}
      uppercase={uppercase}
      buttonColor={resolvedButtonColor}
      textColor={textColor || variantStyle.textColor}
      contentStyle={[
        styles.content,
        {
          height,
        },
        contentStyle,
      ]}
      labelStyle={[styles.label, labelStyle]}
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

const styles = StyleSheet.create({
  button: {
    borderRadius: 18,
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: {
      width: 0,
      height: 0,
    },
    elevation: 0,
  },
  content: {
    justifyContent: 'center',
  },
  label: {
    ...fontStyle('semiBold'),
    fontSize: 17,
    letterSpacing: 0,
  },
});

export default AppButton;
