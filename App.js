/**
 * @format
 * @flow strict-local
 *
 * Changes:
 * - Added global translucent Android StatusBar (transparent, dark-content)
 * - Removed persistent "PRE-RELEASE Version" overlay badge
 */
import React from 'react';
import { View, Keyboard, Platform, StatusBar } from 'react-native';
import VerusMobile from './src/VerusMobile';
import store from './src/store';
import {Provider} from 'react-redux';
import {Provider as PaperProvider} from 'react-native-paper';
import BigNumber from 'bignumber.js';
import theme from './src/globals/paperTheme';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';

// Text and TextInput default to allowFontScaling={false}. React 19 ignores defaultProps on
// function components, so patches/react-native+0.88.1.patch sets that default in React Native.

BigNumber.set({ EXPONENTIAL_AT: 1000000, ROUNDING_MODE: BigNumber.ROUND_FLOOR });

export default class App extends React.Component {
  state = {
    keyboardVisible: false,
  };

  componentDidMount() {
    this.keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      this._keyboardDidShow
    );
    this.keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      this._keyboardDidHide
    );
  }

  componentWillUnmount() {
    this.keyboardDidShowListener.remove();
    this.keyboardDidHideListener.remove();
  }

  _keyboardDidShow = () => {
    this.setState({ keyboardVisible: true });
  };

  _keyboardDidHide = () => {
    this.setState({ keyboardVisible: false });
  };

  render() {
    return (
      <GestureHandlerRootView style={{flex: 1}}>
        <SafeAreaProvider>
          <PaperProvider theme={theme}>
            <Provider store={store}>
              <View style={{flex: 1}}>
                {/* Android draws under a transparent status bar; MainActivity sets that up
                    (React Native 0.87 removed StatusBar translucent and backgroundColor). */}
                {Platform.OS === 'android' && <StatusBar barStyle="dark-content" />}
                <VerusMobile />
              </View>
            </Provider>
          </PaperProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }
}

// Styles removed with PRE-RELEASE overlay
