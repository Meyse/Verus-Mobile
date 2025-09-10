/**
 * Update: Redesign CreatePassword with UI kit and responsive layout, inline validation.
 */
import React, {useEffect, useState} from 'react';
import { View, Dimensions, Text } from 'react-native';
import { TextInput } from 'react-native-paper';
import Colors from '../../../../globals/colors';
import { getSupportedBiometryType } from '../../../../utils/keychain/keychain';
import scorePassword from '../../../../utils/auth/scorePassword';
import { MIN_PASS_LENGTH, MIN_PASS_SCORE, PASS_SCORE_LIMIT, SMALL_DEVICE_HEGHT } from '../../../../utils/constants/constants';
import useResponsive from '../../../../hooks/useResponsive';
import { AppTextField, AppPasswordStrengthBar } from '../../../../components/ui';
import OnboardScreen from '../../../../components/layout/OnboardScreen';

export default function CreatePassword({password, setPassword, navigation}) {
  const {height} = Dimensions.get('window');

  const [firstBox, setFirstBox] = useState('');
  const [passwordStrength, setPasswordStrength] = useState(null);
  const [passwordAffixDetails, setPasswordAffixDetails] = useState({
    text: "strength",
    color: Colors.tertiaryColor
  });
  
  useEffect(() => {
    const handle = setTimeout(() => {
      calculatePasswordAffix()
    }, 200);
    return () => clearTimeout(handle);
  }, [firstBox])

  const calculatePasswordAffix = () => {
    if (!firstBox) {
      setPasswordAffixDetails({
        text: "strength",
        color: Colors.tertiaryColor
      })
    } else {
      const passScore = scorePassword(firstBox, MIN_PASS_LENGTH, PASS_SCORE_LIMIT);
      setPasswordStrength(passScore);

      if (passScore < MIN_PASS_SCORE) {
        setPasswordAffixDetails({
          text: "weak",
          color: Colors.warningButtonColor
        })
      } else if (passScore < PASS_SCORE_LIMIT - ((PASS_SCORE_LIMIT - MIN_PASS_SCORE) / 2)) {
        setPasswordAffixDetails({
          text: "mediocre",
          color: Colors.infoButtonColor
        })
      } else if (passScore < PASS_SCORE_LIMIT) {
        setPasswordAffixDetails({
          text: "good",
          color: Colors.primaryColor
        })
      } else {
        setPasswordAffixDetails({
          text: "excellent",
          color: Colors.verusGreenColor
        })
      }
    }
  }

  const [touched, setTouched] = useState(false);
  const getErrorText = () => {
    if (!touched) return '';
    if (!firstBox || firstBox.length < 1) return 'Please enter a password.';
    if (passwordStrength < MIN_PASS_SCORE) return 'Please enter a stronger password.';
    return '';
  };

  const next = async () => {
    if (!touched) setTouched(true);
    const error = getErrorText();
    if (error) return;
    setPassword(firstBox);
    navigation.navigate('ConfirmPassword');
  };

  const { isVerySmallHeight, isSmallHeight, height: screenHeight } = useResponsive();
  const titleSizeClass = isVerySmallHeight ? 'text-2xl' : isSmallHeight ? 'text-3xl' : 'text-4xl';
  const subtitleLineHeight = isSmallHeight || isVerySmallHeight ? 20 : 22;

  return (
    <OnboardScreen
      title={'Create password'}
      subtitle={'Create a secure password for your profile. Your password will be used to encrypt your wallet.'}
      ctaLabel={'Next'}
      ctaDisabled={!firstBox || passwordStrength < MIN_PASS_SCORE}
      onCtaPress={next}
    >
      <View className="mt-8">
        <Text className="text-sm text-zinc-700 mb-2">{'Password'}</Text>
        <AppTextField
          placeholder="Enter password"
          value={firstBox}
          onChangeText={text => setFirstBox(text)}
          returnKeyType="next"
          onBlur={() => setTouched(true)}
          secureTextEntry={true}
          errorText={getErrorText()}
        />
        <AppPasswordStrengthBar
          active={
            !firstBox || firstBox.length < MIN_PASS_LENGTH
              ? 0
              : passwordStrength >= 100
                ? 4
                : passwordStrength >= (MIN_PASS_SCORE + (PASS_SCORE_LIMIT - MIN_PASS_SCORE) / 2)
                  ? 3
                  : passwordStrength >= MIN_PASS_SCORE
                    ? 2
                    : 1
          }
          max={4}
          label={passwordAffixDetails.text}
          color={passwordAffixDetails.color}
        />
      </View>
    </OnboardScreen>
  );
}
