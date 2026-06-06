/**
 * @format
 * @flow strict-local
 */
import React from 'react';
import VerusMobile from './src/VerusMobile';
import store from './src/store';
import {Provider} from 'react-redux';
import {
  Provider as PaperProvider,
  configureFonts,
  MD2LightTheme
} from 'react-native-paper';
import BigNumber from 'bignumber.js';
import Colors from './src/globals/colors';
import {fontStyle} from './src/globals/fonts';
import applyGlobalTypography from './src/utils/applyGlobalTypography';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';

applyGlobalTypography();

BigNumber.set({ EXPONENTIAL_AT: 1000000, ROUNDING_MODE: BigNumber.ROUND_FLOOR });

const fontConfig = {
  default: {
    regular: fontStyle('regular'),
    medium: fontStyle('semiBold'),
    light: fontStyle('light'),
    thin: fontStyle('extraLight'),
  },
  ios: {
    regular: fontStyle('regular'),
    medium: fontStyle('semiBold'),
    light: fontStyle('light'),
    thin: fontStyle('extraLight'),
  },
  android: {
    regular: fontStyle('regular'),
    medium: fontStyle('semiBold'),
    light: fontStyle('light'),
    thin: fontStyle('extraLight'),
  },
};

const theme = {
  ...MD2LightTheme,
  colors: {
    ...MD2LightTheme.colors,
    primary: Colors.primaryColor,
    accent: Colors.verusGreenColor,
  },
  fonts: configureFonts({config: fontConfig, isV3: false}),
  version: 2
};

export default class App extends React.Component {
  render() {
    return (
      <GestureHandlerRootView style={{flex: 1}}>
        <SafeAreaProvider>
          <PaperProvider theme={theme}>
            <Provider store={store}>
              <VerusMobile />
            </Provider>
          </PaperProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }
}
