/**
 * New screen: SetupWallet
 * - Replaces modal-based setup with inline loading → success UI
 * - Shows spinner in blue card while setting up; shows address on success
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, SafeAreaView, ActivityIndicator, Pressable, Animated, Image } from 'react-native';
import SoftSpotlightBackground from '../../../../components/SoftSpotlightBackground';
import useResponsive from '../../../../hooks/useResponsive';
import { AppButton } from '../../../../components/ui';
import { useDispatch } from 'react-redux';
import { useObjectSelector } from '../../../../hooks/useObjectSelector';
import selectAddresses from '../../../../selectors/address';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import valuWhite from '../../../../images/customIcons/valu-white.png';
import { copyToClipboard } from '../../../../utils/clipboard/clipboard';

export default function SetupWallet({ navigation, createProfile, seed, testProfile }) {
  const dispatch = useDispatch();
  const { isVerySmallHeight, isSmallHeight } = useResponsive();
  const titleSizeClass = isVerySmallHeight ? 'text-2xl' : isSmallHeight ? 'text-3xl' : 'text-4xl';
  const topPadding = isSmallHeight ? 12 : 40;

  const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error'
  const fade = useRef(new Animated.Value(0)).current;
  const dots = useRef(new Animated.Value(0)).current;

  const addresses = useObjectSelector(state => selectAddresses(state));
  const firstAddress = useMemo(() => {
    if (addresses && addresses.results && addresses.results.length > 0) {
      return addresses.results[0]?.address || addresses.results[0];
    }
    return null;
  }, [addresses]);

  useEffect(() => {
    // Start inline setup
    const run = async () => {
      try {
        await createProfile(seed, testProfile, { uiMode: 'inline' });
        // Success will likely populate addresses; we also set success as a guard
        setStatus('success');
        Animated.timing(fade, { toValue: 1, duration: 250, useNativeDriver: true }).start();
      } catch (e) {
        setStatus('error');
      }
    };
    run();
    // Animated dots loop
    Animated.loop(
      Animated.timing(dots, { toValue: 3, duration: 1200, useNativeDriver: false })
    ).start();
  }, []);

  useEffect(() => {
    if (firstAddress && status !== 'success') {
      setStatus('success');
      Animated.timing(fade, { toValue: 1, duration: 250, useNativeDriver: true }).start();
    }
  }, [firstAddress]);

  const short = (addr) => {
    if (!addr || typeof addr !== 'string' || addr.length < 10) return addr || '';
    return addr.slice(0, 5) + '…' + addr.slice(-5);
  };

  const onNext = () => {
    // Now that setup completed and user confirmed, sign in user to move app to signed-in stack
    navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
  };

  const onRetry = () => {
    setStatus('loading');
  };

  const renderDots = () => {
    const value = dots.__getValue ? dots.__getValue() : 0; // RN Animated fallback
    const count = Math.floor(value) % 4; // 0..3
    return '.'.repeat(count);
  };

  return (
    <SafeAreaView className="flex-1">
      <SoftSpotlightBackground pointerEvents="none" className="absolute left-0 right-0 top-0 bottom-0" />

      <View className="flex-1 px-5 pb-6 justify-between" style={{ paddingTop: topPadding }}>
        <View>
          <Text className={'text-zinc-800 font-bold ' + titleSizeClass}>
            {status === 'success' ? 'Congratulations! Your wallet is ready' : `Please wait${renderDots()}`}
          </Text>
          {status !== 'success' ? (
            <Text className="text-zinc-600 mt-2">The system is doing complicated math to get you started, please wait a moment</Text>
          ) : null}

          {/* Gradient Wallet Card */}
          <View className="mt-6 rounded-2xl overflow-hidden" style={{ height: isSmallHeight ? 160 : 200 }}>
            <Svg width="100%" height="100%" preserveAspectRatio="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}>
              <Defs>
                <LinearGradient id="cardGradient" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0%" stopColor="#20B8E3"/>
                  <Stop offset="60%" stopColor="#27C2E0"/>
                  <Stop offset="100%" stopColor="#31D3D9"/>
                </LinearGradient>
              </Defs>
              <Rect x="0" y="0" width="100%" height="100%" rx="16" fill="url(#cardGradient)" />
            </Svg>
            <View style={{ padding: 16, flex: 1 }}>
              {status === 'loading' && (
                <View className="flex-1 items-center justify-center">
                  <ActivityIndicator size="large" color="#ffffff" />
                </View>
              )}
              {status === 'success' && (
                <Animated.View style={{ opacity: fade }} className="flex-1 justify-between">
                  <View className="flex-row justify-between items-start">
                    <Image source={valuWhite} style={{ width: 24, height: 24 }} resizeMode="contain" />
                    <Pressable accessibilityRole="button" accessibilityLabel="Copy address" onPress={() => firstAddress && copyToClipboard(firstAddress)}>
                      <Text className="text-white font-semibold">{short(firstAddress)}</Text>
                    </Pressable>
                  </View>
                  <Text className="text-white/90">0 Verus</Text>
                </Animated.View>
              )}
              {status === 'error' && (
                <View className="flex-1 items-center justify-center">
                  <Text className="text-white text-center">Setup failed. Please try again.</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <View>
          {status === 'error' ? (
            <View className="flex-row justify-between">
              <View className="flex-1 mr-3">
                <AppButton onPress={onRetry}>Retry</AppButton>
              </View>
              <View className="flex-1 ml-3">
                <AppButton variant="secondary" onPress={() => navigation.goBack()}>Back</AppButton>
              </View>
            </View>
          ) : (
            <AppButton onPress={onNext} disabled={status !== 'success'}>
              Next
            </AppButton>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}


