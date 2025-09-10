/**
 * New file: ConfirmPassword
 * - Single confirm field, inline validation, responsive layout
 */
import React, { useState } from 'react';
import { View, Text } from 'react-native';
import useResponsive from '../../../../hooks/useResponsive';
import { AppTextField } from '../../../../components/ui';
import OnboardScreen from '../../../../components/layout/OnboardScreen';

export default function ConfirmPassword({ password, navigation }) {
  const { isVerySmallHeight, isSmallHeight, height: screenHeight } = useResponsive();
  const titleSizeClass = isVerySmallHeight ? 'text-2xl' : isSmallHeight ? 'text-3xl' : 'text-4xl';
  const subtitleLineHeight = isSmallHeight || isVerySmallHeight ? 20 : 22;

  const [confirm, setConfirm] = useState('');
  const [touched, setTouched] = useState(false);

  const getErrorText = () => {
    if (!touched) return '';
    if (!confirm) return 'Please re-enter your password.';
    if (confirm !== password) return 'Passwords do not match.';
    return '';
  };

  const next = () => {
    if (!touched) setTouched(true);
    if (getErrorText()) return;
    navigation.navigate('UseBiometrics');
  };

  return (
    <OnboardScreen
      title={'Confirm password'}
      subtitle={'Re-enter your password to confirm.'}
      ctaLabel={'Next'}
      ctaDisabled={confirm.length === 0 || !!getErrorText()}
      onCtaPress={next}
    >
      <View className="mt-8">
        <Text className="text-sm text-zinc-700 mb-2">{'Confirm password'}</Text>
        <AppTextField
          placeholder="Re-enter password"
          value={confirm}
          onChangeText={text => setConfirm(text)}
          returnKeyType="done"
          onSubmitEditing={next}
          onBlur={() => setTouched(true)}
          secureTextEntry={true}
          errorText={getErrorText()}
        />
      </View>
    </OnboardScreen>
  );
}


