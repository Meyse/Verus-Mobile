import React from 'react';
import {KeyboardAvoidingView, Platform, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import FadedScrollView from '../../components/FadedScrollView';
import ProgressHeader from '../../components/ProgressHeader';
import SafeBottomActionStack from '../../components/SafeBottomActionStack';
import {revokeRecoverFlowStyles as styles} from '../../styles';
import {useAppTheme} from '../../theme/app';

export const RevokeRecoverStepCopy = ({body, compact = false, title}) => {
  const theme = useAppTheme();

  return (
    <View style={[styles.stepCopy, compact && styles.stepCopyCompact]}>
      <Text
        accessibilityRole="header"
        style={[
          theme.typography.headlineMd,
          {color: theme.colors.textPrimary},
        ]}>
        {title}
      </Text>
      {body ? (
        <Text
          style={[
            theme.typography.bodyMd,
            styles.stepBody,
            {color: theme.colors.textSecondary},
          ]}>
          {body}
        </Text>
      ) : null}
    </View>
  );
};

const RevokeRecoverFlowScaffold = ({
  actions,
  backDisabled = false,
  children,
  contentContainerStyle,
  headerTitle = 'VerusID safety',
  keyboardAvoiding = true,
  onBack,
  overlay,
  overlayVisible = false,
  progress,
}) => {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const Wrapper = keyboardAvoiding ? KeyboardAvoidingView : View;
  const wrapperProps = keyboardAvoiding
    ? {behavior: Platform.OS === 'ios' ? 'padding' : undefined}
    : {};

  return (
    <View style={[styles.root, {backgroundColor: theme.colors.background}]}>
      <View
        accessibilityElementsHidden={overlayVisible}
        importantForAccessibility={
          overlayVisible ? 'no-hide-descendants' : 'auto'
        }
        style={styles.content}>
        <ProgressHeader
          backDisabled={backDisabled}
          onBack={onBack}
          progress={progress}
          title={headerTitle}
        />
        <Wrapper {...wrapperProps} style={styles.content}>
          <FadedScrollView
            bounces={false}
            containerStyle={styles.scrollViewport}
            contentContainerStyle={[
              styles.scrollContent,
              {
                paddingLeft: 20 + insets.left,
                paddingRight: 20 + insets.right,
              },
              contentContainerStyle,
            ]}
            fadeBackgroundColor={theme.colors.background}
            fadeLength={42}
            keyboardDismissMode={
              Platform.OS === 'ios' ? 'interactive' : 'on-drag'
            }
            keyboardShouldPersistTaps="handled"
            style={styles.scrollViewport}
            showStartFade={false}>
            {children}
          </FadedScrollView>
          {actions ? (
            <SafeBottomActionStack
              gap={8}
              horizontalSpacing={20}
              safeAreaSpacing={0}>
              {actions}
            </SafeBottomActionStack>
          ) : null}
        </Wrapper>
      </View>
      {overlay}
    </View>
  );
};

export default RevokeRecoverFlowScaffold;
