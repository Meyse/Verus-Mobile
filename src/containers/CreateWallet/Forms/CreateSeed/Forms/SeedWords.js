import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import {Text} from 'react-native-paper';
import AppButton from '../../../../../components/AppButton';
import AppTextInput from '../../../../../components/AppTextInput';
import SafeBottomActionStack from '../../../../../components/SafeBottomActionStack';
import {fontStyle} from '../../../../../globals/fonts';
import {createSignedOutFlowStyles} from '../../../../../styles';
import {useOnboardingTheme} from '../../../../../theme/onboarding';
import {
  ONBOARDING_KEYBOARD_FOOTER_SPACING,
  useOnboardingSmallDeviceLayout,
} from '../../../../../hooks/useOnboardingSmallDeviceLayout';
import CompactSetupHeader from '../../../../Onboard/components/CompactSetupHeader';

export const WORDS_PER_STEP = 8;
const VERIFY_WORD_COUNT = 3;
const PAGE_ANIMATION_DURATION = 320;
const VERIFY_INPUT_FOCUS_DELAY = 80;

const getRandomIndices = length => {
  const indices = [];

  while (indices.length < Math.min(VERIFY_WORD_COUNT, length)) {
    const index = Math.floor(Math.random() * length);

    if (!indices.includes(index)) {
      indices.push(index);
    }
  }

  return indices;
};

export default function SeedWords({
  navigation,
  newSeed,
  onComplete,
  onBack,
  formStep: controlledFormStep,
  setFormStep: controlledSetFormStep,
  showHeader = true,
}) {
  const theme = useOnboardingTheme();
  const signedOutFlowStyles = useMemo(
    () => createSignedOutFlowStyles(theme),
    [theme],
  );
  const styles = useMemo(() => createStyles(theme), [theme]);
  const seedWords = useMemo(
    () => (newSeed ? newSeed.split(' ').filter(Boolean) : []),
    [newSeed],
  );
  const totalWordSteps = Math.ceil(seedWords.length / WORDS_PER_STEP);
  const [internalFormStep, setInternalFormStep] = useState(0);
  const [randomIndices, setRandomIndices] = useState([]);
  const [activeVerifyIndex, setActiveVerifyIndex] = useState(0);
  const [wordGuesses, setWordGuesses] = useState(['', '', '']);
  const [wordErrors, setWordErrors] = useState([false, false, false]);
  const pageProgress = useRef(new Animated.Value(0)).current;
  const verifyInputRef = useRef(null);
  const {keyboardVisible, smallDevice, smallDeviceKeyboardVisible} =
    useOnboardingSmallDeviceLayout();
  const formStep =
    controlledFormStep == null ? internalFormStep : controlledFormStep;
  const setActiveFormStep = controlledSetFormStep || setInternalFormStep;

  const isAtEnd = formStep >= totalWordSteps;
  const firstIndex = formStep * WORDS_PER_STEP;
  const displayWords = isAtEnd
    ? []
    : seedWords.slice(firstIndex, firstIndex + WORDS_PER_STEP);
  const activeRandomIndex = randomIndices[activeVerifyIndex];
  const activeVerifyWordNumber =
    activeRandomIndex == null ? null : activeRandomIndex + 1;
  const activeWordGuess = wordGuesses[activeVerifyIndex] || '';
  const activeVerifyInputError = wordErrors[activeVerifyIndex];
  const activeVerifyWordHasValue = activeWordGuess.trim().length > 0;
  const isLastVerifyWord = activeVerifyIndex === randomIndices.length - 1;
  const hasOtherIncompleteVerifyWords =
    isAtEnd &&
    randomIndices.some((_, index) => {
      return index !== activeVerifyIndex && !wordGuesses[index]?.trim();
    });
  const verifyActionCompletes =
    isLastVerifyWord && !hasOtherIncompleteVerifyWords;
  const canContinue =
    !isAtEnd || (randomIndices.length > 0 && activeVerifyWordHasValue);
  const progress = isAtEnd ? 0.95 : Math.min(0.9, 0.78 + formStep * 0.07);
  const pageAnimatedStyle = {
    opacity: pageProgress,
    transform: [
      {
        translateY: pageProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [18, 0],
        }),
      },
      {
        scale: pageProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [0.985, 1],
        }),
      },
    ],
  };

  useEffect(() => {
    setActiveFormStep(0);
    setActiveVerifyIndex(0);
    setWordGuesses(['', '', '']);
    setWordErrors([false, false, false]);
  }, [newSeed, setActiveFormStep]);

  useEffect(() => {
    let active = true;
    let animation;

    AccessibilityInfo.isReduceMotionEnabled()
      .then(reduceMotionEnabled => {
        if (!active) return;

        pageProgress.stopAnimation();

        if (reduceMotionEnabled) {
          pageProgress.setValue(1);
          return;
        }

        pageProgress.setValue(0);
        animation = Animated.timing(pageProgress, {
          toValue: 1,
          duration: PAGE_ANIMATION_DURATION,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        });
        animation.start();
      })
      .catch(() => {
        if (active) {
          pageProgress.setValue(1);
        }
      });

    return () => {
      active = false;

      if (animation) {
        animation.stop();
      }

      pageProgress.stopAnimation();
    };
  }, [formStep, isAtEnd, pageProgress]);

  useEffect(() => {
    if (isAtEnd && seedWords.length > 0) {
      const indices = getRandomIndices(seedWords.length);

      setRandomIndices(indices);
      setActiveVerifyIndex(0);
      setWordGuesses(new Array(indices.length).fill(''));
      setWordErrors(new Array(indices.length).fill(false));
    }
  }, [isAtEnd, seedWords.length]);

  useEffect(() => {
    setWordErrors(new Array(randomIndices.length).fill(false));
  }, [wordGuesses, randomIndices.length]);

  const updateGuess = (index, text) => {
    const nextGuesses = [...wordGuesses];

    nextGuesses[index] = text;
    setWordGuesses(nextGuesses);
  };

  const focusVerifyInput = () => {
    setTimeout(() => {
      verifyInputRef.current?.focus?.();
    }, VERIFY_INPUT_FOCUS_DELAY);
  };

  const goToVerifyIndex = index => {
    const nextIndex = Math.max(0, Math.min(index, randomIndices.length - 1));

    setActiveVerifyIndex(nextIndex);
    focusVerifyInput();
  };

  const verifySeed = () => {
    const errors = randomIndices.map((randomIndex, index) => {
      const expected = seedWords[randomIndex].trim().toLowerCase();
      const guess = wordGuesses[index].trim().toLowerCase();

      return guess !== expected;
    });

    setWordErrors(errors);

    if (errors.some(Boolean)) {
      goToVerifyIndex(errors.findIndex(Boolean));
      return;
    }

    onComplete();
  };

  const verifyNext = () => {
    if (!activeVerifyWordHasValue) return;

    if (!isLastVerifyWord) {
      goToVerifyIndex(activeVerifyIndex + 1);
      return;
    }

    const firstIncompleteIndex = wordGuesses.findIndex(guess => !guess?.trim());

    if (firstIncompleteIndex >= 0) {
      goToVerifyIndex(firstIncompleteIndex);
      return;
    }

    verifySeed();
  };

  const next = () => {
    if (!canContinue) return;

    if (isAtEnd) {
      verifyNext();
    } else {
      setActiveFormStep(step => step + 1);
    }
  };

  const back = () => {
    if (formStep > 0) {
      setActiveFormStep(step => step - 1);
    } else {
      if (onBack) {
        onBack();
      } else {
        navigation.goBack();
      }
    }
  };

  const getPrimaryLabel = () => {
    if (isAtEnd) {
      return verifyActionCompletes ? 'Create wallet' : 'Next word';
    }

    if (formStep === totalWordSteps - 1) return 'Verify phrase';

    return 'Next words';
  };

  const getWordTileAnimatedStyle = index => {
    const start = Math.min(0.5, 0.08 + index * 0.045);

    return {
      opacity: pageProgress.interpolate({
        inputRange: [0, start, 1],
        outputRange: [0, 0, 1],
      }),
      transform: [
        {
          translateY: pageProgress.interpolate({
            inputRange: [0, start, 1],
            outputRange: [18, 18, 0],
          }),
        },
        {
          scale: pageProgress.interpolate({
            inputRange: [0, start, 1],
            outputRange: [0.97, 0.97, 1],
          }),
        },
      ],
    };
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={signedOutFlowStyles.container}>
      {showHeader ? (
        <CompactSetupHeader onBack={back} progress={progress} />
      ) : null}
      <TouchableWithoutFeedback
        accessible={false}
        onPress={() => Keyboard.dismiss()}>
        <View style={styles.content}>
          <ScrollView
            bounces={false}
            contentContainerStyle={[
              signedOutFlowStyles.scrollContent,
              smallDevice && signedOutFlowStyles.scrollContentSmallDevice,
              smallDeviceKeyboardVisible &&
                isAtEnd &&
                signedOutFlowStyles.scrollContentKeyboardFooterClearance,
            ]}
            keyboardDismissMode={
              Platform.OS === 'ios' ? 'interactive' : 'on-drag'
            }
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <Animated.View
              style={[signedOutFlowStyles.form, pageAnimatedStyle]}>
              <Text
                style={[
                  signedOutFlowStyles.title,
                  smallDevice && signedOutFlowStyles.titleSmallDevice,
                ]}>
                {isAtEnd ? 'Verify recovery phrase' : 'Write down these words'}
              </Text>
              {isAtEnd && smallDevice ? null : (
                <Text style={styles.contextText}>
                  {isAtEnd
                    ? 'Enter the requested words to confirm your backup.'
                    : `Words ${firstIndex + 1}-${
                        firstIndex + displayWords.length
                      } of ${seedWords.length}`}
                </Text>
              )}
              {isAtEnd ? (
                <View
                  style={[
                    styles.verifyForm,
                    smallDevice && styles.verifyFormSmallDevice,
                  ]}>
                  <View
                    style={[
                      styles.verifyStepper,
                      smallDevice && styles.verifyStepperSmallDevice,
                    ]}>
                    {randomIndices.map((randomIndex, index) => {
                      const isActive = index === activeVerifyIndex;
                      const hasValue = wordGuesses[index]?.trim().length > 0;
                      const hasError = wordErrors[index];
                      const guessedWord = wordGuesses[index]?.trim();

                      return (
                        <TouchableOpacity
                          accessibilityLabel={`Word ${randomIndex + 1}`}
                          accessibilityRole="button"
                          activeOpacity={0.78}
                          key={randomIndex}
                          onPress={() => goToVerifyIndex(index)}
                          testID={`onboarding.seedWords.verifyChip.${index + 1}`}
                          style={[
                            styles.verifyStepChip,
                            hasValue && styles.verifyStepChipComplete,
                            isActive && styles.verifyStepChipActive,
                            hasError && styles.verifyStepChipError,
                          ]}>
                          <Text
                            style={[
                              styles.verifyStepChipText,
                              hasValue && styles.verifyStepChipTextComplete,
                              isActive && styles.verifyStepChipTextActive,
                              hasError && styles.verifyStepChipTextError,
                            ]}>
                            {randomIndex + 1}
                          </Text>
                          {hasValue ? (
                            <Text
                              ellipsizeMode="tail"
                              numberOfLines={1}
                              style={[
                                styles.verifyStepChipWord,
                                isActive && styles.verifyStepChipWordActive,
                                hasError && styles.verifyStepChipTextError,
                              ]}>
                              {guessedWord}
                            </Text>
                          ) : null}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <Text
                    style={[
                      styles.verifyProgressText,
                      smallDevice && styles.verifyProgressTextSmallDevice,
                    ]}>
                    {`${activeVerifyIndex + 1} of ${randomIndices.length}`}
                  </Text>
                  <AppTextInput
                    autoCapitalize="none"
                    autoComplete="off"
                    autoCorrect={false}
                    blurOnSubmit={false}
                    containerStyle={[
                      styles.verifyInput,
                      smallDevice && styles.verifyInputSmallDevice,
                    ]}
                    enablesReturnKeyAutomatically
                    errorText={
                      activeVerifyInputError ? 'Does not match.' : null
                    }
                    importantForAutofill="no"
                    label={
                      activeVerifyWordNumber == null
                        ? 'Word'
                        : `Word ${activeVerifyWordNumber}`
                    }
                    onChangeText={text => updateGuess(activeVerifyIndex, text)}
                    onSubmitEditing={next}
                    placeholder={
                      activeVerifyWordNumber == null
                        ? 'Enter word'
                        : `Enter word ${activeVerifyWordNumber}`
                    }
                    ref={verifyInputRef}
                    returnKeyType={verifyActionCompletes ? 'done' : 'next'}
                    spellCheck={false}
                    testID="onboarding.seedWords.verifyInput"
                    textContentType="none"
                    value={activeWordGuess}
                  />
                </View>
              ) : (
                <View style={styles.wordsGrid}>
                  {displayWords.map((word, index) => (
                    <Animated.View
                      key={`${firstIndex + index}-${word}`}
                      style={[
                        styles.wordTile,
                        getWordTileAnimatedStyle(index),
                      ]}>
                      <Text style={styles.wordIndex}>
                        {firstIndex + index + 1}
                      </Text>
                      <Text
                        style={styles.wordText}
                        testID={`onboarding.seedWords.word.${
                          firstIndex + index + 1
                        }`}>
                        {word}
                      </Text>
                    </Animated.View>
                  ))}
                </View>
              )}
            </Animated.View>
          </ScrollView>
        </View>
      </TouchableWithoutFeedback>
      <SafeBottomActionStack
        bottomSpacing={keyboardVisible ? ONBOARDING_KEYBOARD_FOOTER_SPACING : 30}
        gap={10}
        includeBottomInset={!keyboardVisible}
        safeAreaSpacing={
          keyboardVisible ? ONBOARDING_KEYBOARD_FOOTER_SPACING : 12
        }>
        <AppButton
          disabled={!canContinue}
          height={56}
          onPress={next}
          testID="onboarding.seedWords.next"
          variant="primary">
          {getPrimaryLabel()}
        </AppButton>
      </SafeBottomActionStack>
    </KeyboardAvoidingView>
  );
}

const createStyles = theme =>
  StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: 32,
  },
  contextText: {
    marginTop: 10,
    color: theme.colors.textSecondary,
    fontSize: 15,
    lineHeight: 21,
    ...fontStyle('regular'),
  },
  wordsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 26,
  },
  wordTile: {
    width: '48%',
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceMuted,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  wordIndex: {
    width: 32,
    color: theme.colors.textSubtle,
    fontSize: 14,
    lineHeight: 20,
    ...fontStyle('bold'),
  },
  wordText: {
    flex: 1,
    color: theme.colors.textPrimary,
    fontSize: 17,
    lineHeight: 23,
    ...fontStyle('semiBold'),
  },
  verifyForm: {
    marginTop: 26,
  },
  verifyFormSmallDevice: {
    marginTop: 12,
  },
  verifyStepper: {
    flexDirection: 'row',
    gap: 8,
  },
  verifyStepperSmallDevice: {
    gap: 6,
  },
  verifyStepChip: {
    flex: 1,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    backgroundColor: theme.colors.surfaceMuted,
  },
  verifyStepChipActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.surface,
    shadowColor: theme.colors.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 2,
  },
  verifyStepChipComplete: {
    borderColor: theme.colors.borderStrong,
    backgroundColor: theme.colors.surfaceRaised,
  },
  verifyStepChipError: {
    borderColor: theme.colors.danger,
    backgroundColor: theme.colors.surfaceRaised,
  },
  verifyStepChipText: {
    color: theme.colors.textSubtle,
    fontSize: 15,
    lineHeight: 20,
    ...fontStyle('semiBold'),
  },
  verifyStepChipTextActive: {
    color: theme.colors.primary,
  },
  verifyStepChipTextComplete: {
    color: theme.colors.textPrimary,
  },
  verifyStepChipTextError: {
    color: theme.colors.danger,
  },
  verifyStepChipWord: {
    maxWidth: '100%',
    marginTop: 1,
    paddingHorizontal: 6,
    color: theme.colors.textPrimary,
    fontSize: 12,
    lineHeight: 16,
    ...fontStyle('semiBold'),
  },
  verifyStepChipWordActive: {
    color: theme.colors.primary,
  },
  verifyProgressText: {
    marginTop: 14,
    color: theme.colors.textSubtle,
    fontSize: 13,
    lineHeight: 18,
    ...fontStyle('semiBold'),
  },
  verifyProgressTextSmallDevice: {
    marginTop: 8,
  },
  verifyInput: {
    marginTop: 12,
  },
  verifyInputSmallDevice: {
    marginTop: 8,
  },
});
