import {configureFonts, MD2LightTheme} from 'react-native-paper';
import Colors from './colors';

const fontConfig = {
  default: {
    regular: {
      fontFamily: 'SourceSansPro-Regular',
      fontWeight: 'normal',
    },
    medium: {
      fontFamily: 'SourceSansPro-SemiBold',
      fontWeight: 'normal',
    },
    light: {
      fontFamily: 'SourceSansPro-Light',
      fontWeight: 'normal',
    },
    thin: {
      fontFamily: 'SourceSansPro-ExtraLight',
      fontWeight: 'normal',
    },
  },
  ios: {
    regular: {
      fontFamily: 'SourceSansPro-Regular',
      fontWeight: 'normal',
    },
    medium: {
      fontFamily: 'SourceSansPro-SemiBold',
      fontWeight: 'normal',
    },
    light: {
      fontFamily: 'SourceSansPro-Light',
      fontWeight: 'normal',
    },
    thin: {
      fontFamily: 'SourceSansPro-ExtraLight',
      fontWeight: 'normal',
    },
  },
  android: {
    regular: {
      fontFamily: 'SourceSansPro-Regular',
      fontWeight: 'normal',
    },
    medium: {
      fontFamily: 'SourceSansPro-SemiBold',
      fontWeight: 'normal',
    },
    light: {
      fontFamily: 'SourceSansPro-Light',
      fontWeight: 'normal',
    },
    thin: {
      fontFamily: 'SourceSansPro-ExtraLight',
      fontWeight: 'normal',
    },
  },
};

const theme = {
  ...MD2LightTheme,
  colors: {
    ...MD2LightTheme.colors,
    primary: Colors.primaryColor,
    accent: Colors.verusGreenColor,
  },
  // configureFonts(fontConfig) without `isV3: false` returns Paper's MD3 font set, so this MD2 theme has no
  // regular/medium/light/thin entries and Paper's MD2 components use the system font. Paper 5.15 TextInput reads
  // theme.fonts.regular.fontWeight and throws when the entry is missing. Empty entries keep the current look.
  // Using fontConfig (configureFonts({config: fontConfig, isV3: false})) would change Paper components to Source
  // Sans Pro: a UI change for the redesign to decide.
  fonts: {...configureFonts(fontConfig), regular: {}, medium: {}, light: {}, thin: {}},
  version: 2
};

export default theme;
