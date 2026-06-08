import React, {useEffect, useRef, useState} from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import {Text} from 'react-native-paper';
import {createAlert} from '../../../../../actions/actions/alert/dispatchers/alert';
import AppButton from '../../../../../components/AppButton';
import AppTextInput from '../../../../../components/AppTextInput';
import SafeBottomActionStack from '../../../../../components/SafeBottomActionStack';
import {signedOutFlowStyles} from '../../../../../styles';

const CONTENT_ANIMATION_DURATION = 320;

export default function ImportText({
  importedSeed,
  onComplete,
  setImportedSeed,
}) {
  const [showSeed, setShowSeed] = useState(false);
  const contentProgress = useRef(new Animated.Value(0)).current;

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

  const handleImport = () => {
    if (!importedSeed || importedSeed.length < 1) {
      createAlert('Error', 'Please enter a seed, WIF key or spending key.');
    } else {
      onComplete();
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
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={signedOutFlowStyles.container}>
      <TouchableWithoutFeedback
        accessible={false}
        onPress={() => Keyboard.dismiss()}>
        <View style={styles.content}>
          <ScrollView
            contentContainerStyle={signedOutFlowStyles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <Animated.View
              style={[signedOutFlowStyles.form, contentAnimatedStyle]}>
              <Text style={signedOutFlowStyles.title}>
                {'Import private key or seed'}
              </Text>
              <AppTextInput
                autoComplete="off"
                importantForAutofill="no"
                inputStyle={styles.seedInputText}
                label="Private key or seed"
                multiline={showSeed && Platform.OS !== 'ios'}
                onChangeText={setImportedSeed}
                onRightPress={() => setShowSeed(value => !value)}
                rightAccessibilityLabel={
                  showSeed
                    ? 'Hide private key or seed'
                    : 'Show private key or seed'
                }
                rightIcon={showSeed ? 'eye-off' : 'eye'}
                secureTextEntry={!showSeed}
                textContentType="none"
                value={importedSeed}
              />
            </Animated.View>
          </ScrollView>
        </View>
      </TouchableWithoutFeedback>
      <SafeBottomActionStack>
        <AppButton
          disabled={importedSeed == null || importedSeed.length === 0}
          height={56}
          onPress={handleImport}
          variant="primary">
          {'Import'}
        </AppButton>
      </SafeBottomActionStack>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: 32,
  },
  seedInputText: {
    minHeight: 54,
  },
});
