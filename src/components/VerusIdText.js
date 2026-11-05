import React from 'react';
import {Platform, StyleSheet, Text} from 'react-native';
import {useAppTheme} from '../theme/app';

// Same Inter glyphs and metrics, with contextual alternates removed. Android
// selects a file per weight; iOS selects the registered family and weight.
export const verusIdFontStyle = style => {
  const {fontFamily = '', fontWeight = '400'} = StyleSheet.flatten(style) || {};
  const weight = {500: 'Medium', 600: 'SemiBold', 700: 'Bold', bold: 'Bold'}[fontWeight] ||
    /-(Medium|SemiBold|Bold)$/.exec(fontFamily)?.[1] || 'Regular';
  return Platform.OS === 'ios'
    ? {fontFamily: 'Verus Name', fontWeight}
    : {fontFamily: `VerusName-${weight}`, fontWeight: 'normal'};
};

// Only names change font. Surrounding prose retains its original typography.
export default function VerusIdText({children, style, ...props}) {
  const theme = useAppTheme();
  const nameStyle = verusIdFontStyle([theme.typography.bodySm, style]);
  return <Text {...props} style={style}>{React.Children.map(children, child => typeof child === 'string'
    ? child.split(/([^\s()]+@)(?=$|[\s),.;!?])/g).map((part, index) => part.endsWith('@')
      ? <Text key={index} style={nameStyle}>{part}</Text> : part)
    : child)}</Text>;
}
