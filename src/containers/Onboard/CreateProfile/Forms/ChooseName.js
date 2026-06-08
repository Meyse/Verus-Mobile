import React, {useEffect, useRef, useState} from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Keyboard,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import {Text} from 'react-native-paper';
import AppButton from '../../../../components/AppButton';
import SafeBottomActionStack from '../../../../components/SafeBottomActionStack';
import {useObjectSelector} from '../../../../hooks/useObjectSelector';
import AppTextInput from '../../../../components/AppTextInput';
import WalletAvatar from '../../../../components/WalletAvatar';
import {
  DEFAULT_WALLET_AVATAR,
  normalizeWalletAvatar,
} from '../../../../utils/walletAvatar';
import WalletAvatarPickerSheet from './WalletAvatarPickerSheet';
import {signedOutFlowStyles} from '../../../../styles';

const CONTENT_ANIMATION_DURATION = 320;

export default function ChooseName({
  profileName,
  setProfileName,
  walletAvatar = DEFAULT_WALLET_AVATAR,
  setWalletAvatar,
  navigation,
  onNext,
}) {
  const [nameError, setNameError] = useState(null);
  const [avatarSheetVisible, setAvatarSheetVisible] = useState(false);
  const contentProgress = useRef(new Animated.Value(0)).current;
  const accounts = useObjectSelector(state => state.authentication.accounts);
  const selectedWalletAvatar = normalizeWalletAvatar(
    walletAvatar,
    DEFAULT_WALLET_AVATAR,
  );

  useEffect(() => {
    let active = true;
    let animation;

    AccessibilityInfo.isReduceMotionEnabled()
      .then(reduceMotionEnabled => {
        if (!active) return;

        contentProgress.stopAnimation();

        if (reduceMotionEnabled) {
          contentProgress.setValue(1);
          return;
        }

        contentProgress.setValue(0);
        animation = Animated.timing(contentProgress, {
          toValue: 1,
          duration: CONTENT_ANIMATION_DURATION,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        });
        animation.start();
      })
      .catch(() => {
        if (active) {
          contentProgress.setValue(1);
        }
      });

    return () => {
      active = false;

      if (animation) {
        animation.stop();
      }

      contentProgress.stopAnimation();
    };
  }, [contentProgress]);

  const isDuplicateAccount = accountID => {
    let index = 0;

    while (index < accounts.length && accountID !== accounts[index].id) {
      index++;
    }

    if (index < accounts.length) {
      return true;
    } else {
      return false;
    }
  };

  const validate = () => {
    const res = {valid: false, message: ''};

    if (!profileName || profileName.length < 1) {
      res.message = 'Please enter a wallet name.';
      return res;
    } else if (profileName.length > 50) {
      res.message = 'Please enter a wallet name shorter than 50 characters.';
      return res;
    } else if (isDuplicateAccount(profileName)) {
      res.message = 'A wallet with this name already exists.';
      return res;
    }

    res.valid = true;
    return res;
  };

  const next = () => {
    const {valid, message} = validate();

    if (!valid) {
      setNameError(message);
    } else {
      setNameError(null);
      if (onNext) {
        onNext();
      } else if (navigation) {
        navigation.navigate('CreatePassword');
      }
    }
  };

  const updateProfileName = text => {
    if (nameError) setNameError(null);

    setProfileName(text);
  };

  const openAvatarSheet = () => {
    Keyboard.dismiss();
    setAvatarSheetVisible(true);
  };

  const updateWalletAvatar = nextWalletAvatar => {
    if (typeof setWalletAvatar === 'function') {
      setWalletAvatar(
        normalizeWalletAvatar(nextWalletAvatar, DEFAULT_WALLET_AVATAR),
      );
    }
  };

  const contentAnimatedStyle = {
    opacity: contentProgress,
    transform: [
      {
        translateY: contentProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [18, 0],
        }),
      },
      {
        scale: contentProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [0.985, 1],
        }),
      },
    ],
  };

  return (
    <View style={signedOutFlowStyles.container}>
      <TouchableWithoutFeedback
        onPress={() => Keyboard.dismiss()}
        accessible={false}>
        <View style={signedOutFlowStyles.content}>
          <Animated.View
            style={[signedOutFlowStyles.form, contentAnimatedStyle]}>
            <Text style={signedOutFlowStyles.title}>
              {'Personalize your wallet'}
            </Text>
            <AppTextInput
              returnKeyType="done"
              errorText={nameError}
              label="Wallet name"
              value={profileName}
              placeholder="Enter wallet name"
              inputStyle={styles.inputWithAvatar}
              leftAccessory={
                <TouchableOpacity
                  accessibilityLabel="Choose wallet icon and color"
                  accessibilityRole="button"
                  activeOpacity={0.74}
                  onPress={openAvatarSheet}
                  style={styles.avatarButton}>
                  <WalletAvatar
                    walletAvatar={selectedWalletAvatar}
                    size={40}
                    emojiSize={21}
                  />
                </TouchableOpacity>
              }
              onSubmitEditing={next}
              onChangeText={updateProfileName}
            />
          </Animated.View>
        </View>
      </TouchableWithoutFeedback>
      <WalletAvatarPickerSheet
        visible={avatarSheetVisible}
        walletAvatar={selectedWalletAvatar}
        onChange={updateWalletAvatar}
        onClose={() => setAvatarSheetVisible(false)}
      />
      <SafeBottomActionStack>
        <AppButton
          onPress={next}
          disabled={profileName.length == 0}
          variant="primary"
          height={56}>
          {'Next'}
        </AppButton>
      </SafeBottomActionStack>
    </View>
  );
}

const styles = StyleSheet.create({
  inputWithAvatar: {
    paddingLeft: 8,
  },
  avatarButton: {
    width: 42,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
