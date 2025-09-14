/**
 * New screen: SetupWallet
 * - Replaces modal-based setup with inline loading → success UI
 * - Shows spinner in blue card while setting up; shows address on success
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, SafeAreaView, ActivityIndicator, Pressable, Animated, Image } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import SoftSpotlightBackground from '../../../../components/SoftSpotlightBackground';
import useResponsive from '../../../../hooks/useResponsive';
import { AppButton } from '../../../../components/ui';
import { useDispatch } from 'react-redux';
import { useObjectSelector } from '../../../../hooks/useObjectSelector';
import { signIntoAuthenticatedAccount, setProfileCreationInProgress } from '../../../../actions/actionCreators';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import valuWhite from '../../../../images/customIcons/valu-white.png';
import { copyToClipboard } from '../../../../utils/clipboard/clipboard';
import { CoinDirectory } from '../../../../utils/CoinData/CoinDirectory';
import { VRPC } from '../../../../utils/constants/intervalConstants';
import { getAddressBalances as vrpcGetAddressBalances } from '../../../../utils/api/channels/vrpc/callCreators';
import BigNumber from 'bignumber.js';
import { satsToCoins } from '../../../../utils/math';

export default function SetupWallet({ navigation, createProfile, seed, testProfile }) {
  const dispatch = useDispatch();
  const { isVerySmallHeight, isSmallHeight } = useResponsive();
  const titleSizeClass = isVerySmallHeight ? 'text-2xl' : isSmallHeight ? 'text-3xl' : 'text-4xl';
  const topPadding = isSmallHeight ? 12 : 40;

  const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error'
  const fade = useRef(new Animated.Value(0)).current;
  // Removed animated dots

  const activeAccount = useObjectSelector(state => state.authentication.activeAccount);
  const firstAddress = useMemo(() => {
    // Derive VRSC transparent address from keys; prefer 'R' addresses
    try {
      const vrscEntry = activeAccount?.keys?.VRSC;
      if (vrscEntry) {
        let fallback = null;
        for (const ch of Object.keys(vrscEntry)) {
          const entry = vrscEntry[ch];
          if (entry && Array.isArray(entry.addresses) && entry.addresses.length > 0) {
            const candidate = entry.addresses[0]?.address || entry.addresses[0];
            if (typeof candidate === 'string') {
              if (candidate.startsWith('R')) return candidate;
              if (!fallback) fallback = candidate;
            }
          }
        }
        return fallback;
      }
    } catch {}
    return null;
  }, [activeAccount]);

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
    // no-op
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
    // User confirms; allow root to switch to signed-in stack
    dispatch(signIntoAuthenticatedAccount());
    dispatch(setProfileCreationInProgress(false));
  };

  const onRetry = () => {
    setStatus('loading');
  };

  // Local balance state; fetch native VRSC balance once address is available
  const [balance, setBalance] = useState('0');
  useEffect(() => {
    const fetchBalance = async () => {
      try {
        if (!firstAddress) return;
        const coinObj = CoinDirectory.findCoinObj('VRSC');
        const res = await vrpcGetAddressBalances(coinObj.system_id, [firstAddress]);
        if (res && res.result && typeof res.result.balance !== 'undefined') {
          setBalance(satsToCoins(BigNumber(res.result.balance)).toString());
        }
      } catch (e) {
        console.warn('Balance fetch error', e);
      }
    };
    fetchBalance();
  }, [firstAddress]);

  const renderDots = () => '';

  return (
    <SafeAreaView className="flex-1">
      <SoftSpotlightBackground pointerEvents="none" className="absolute left-0 right-0 top-0 bottom-0" />

      <View className="flex-1 px-5 pb-6 justify-between" style={{ paddingTop: topPadding }}>
        <View>
          <Text className={'text-zinc-800 font-bold ' + titleSizeClass}>
            {status === 'success' ? 'Congratulations! Your wallet is ready' : 'Almost ready.'}
          </Text>
          {status !== 'success' ? (
            <Text className="text-zinc-600 mt-2">Finalizing your secure wallet setup. This takes a few moments.</Text>
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
                    <Image source={valuWhite} style={{ width: 32, height: 32 }} resizeMode="contain" />
                    <Pressable accessibilityRole="button" accessibilityLabel="Copy address" onPress={() => firstAddress && copyToClipboard(firstAddress)} className="flex-row items-center">
                      <Text className="text-white font-semibold mr-2">{short(firstAddress)}</Text>
                      <Icon name="content-copy" size={18} color="#ffffff" />
                    </Pressable>
                  </View>
                  <Text className="text-white/90">{balance} Verus</Text>
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
            <View>
              {status === 'success' ? (
                <Text className="text-center text-xs text-zinc-600 mb-6">Congratulations! Your wallet has been successfully set up and is now ready for use.</Text>
              ) : null}
              <AppButton onPress={onNext} disabled={status !== 'success'}>
                Next
              </AppButton>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}


