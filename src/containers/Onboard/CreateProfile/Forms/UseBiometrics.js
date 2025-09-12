import React, { useState } from 'react';
import { View, Image, Text } from 'react-native';
import Colors from '../../../../globals/colors';
import { canEnableBiometry } from '../../../../actions/actions/channels/dlight/dispatchers/AlertManager';
import { SMALL_DEVICE_HEGHT } from '../../../../utils/constants/constants';
import OnboardScreen from '../../../../components/layout/OnboardScreen';
import useResponsive from '../../../../hooks/useResponsive';
import { AppButton } from '../../../../components/ui';
import biometricImg from '../../../../images/customIcons/biometric-img.png';

export default function UseBiometrics({ setUseBiometrics, navigation, walletType }) {
  const [notAvailable, setNotAvailable] = useState(false);
  const { isVerySmallHeight, isSmallHeight } = useResponsive();

  const next = async (enable) => {
    if (enable) {
      const ok = await canEnableBiometry();
      if (!ok) {
        setNotAvailable(true);
        return;
      }
    }
    setUseBiometrics(enable);
    if (walletType === 'import') {
      navigation.navigate('ImportWallet');
    } else {
      navigation.navigate('CreateWallet');
    }
  };

  return (
    <OnboardScreen
      title={'Biometric authentication'}
      subtitle={notAvailable ? 'Biometrics not available on this device.' : 'Sign into your profile with biometric authentication. You can always change this later.'}
      ctaLabel={'Enable'}
      ctaDisabled={false}
      onCtaPress={() => next(true)}
      secondaryCtaLabel={'Skip'}
      secondaryCtaVariant={'secondary'}
      onSecondaryCtaPress={() => next(false)}
      forceScroll={true}
      reverseLayout={true}
    >
      <View className="mb-8 items-center">
        <Image 
          source={biometricImg} 
          resizeMode="contain" 
          style={{ width: '100%', height: isVerySmallHeight ? 140 : isSmallHeight ? 180 : 220 }} 
        />
      </View>
    </OnboardScreen>
  );
}
