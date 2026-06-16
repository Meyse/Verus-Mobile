import React, {useMemo, useState} from 'react';
import {ScrollView} from 'react-native';
import {
  deepLinkRequestReviewStyles as createDeepLinkRequestReviewStyles,
} from '../../../../styles';
import {useOnboardingTheme} from '../../../../theme/onboarding';

const SCROLL_THRESHOLD = 48;

const DeepLinkReviewScrollView = ({
  children,
  contentContainerStyle,
  style,
}) => {
  const theme = useOnboardingTheme();
  const styles = useMemo(
    () => createDeepLinkRequestReviewStyles(theme),
    [theme],
  );
  const [viewportHeight, setViewportHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const scrollEnabled =
    viewportHeight > 0 && contentHeight > viewportHeight + SCROLL_THRESHOLD;

  return (
    <ScrollView
      alwaysBounceVertical={false}
      bounces={false}
      contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
      onContentSizeChange={(_, height) => setContentHeight(height)}
      onLayout={event => setViewportHeight(event.nativeEvent.layout.height)}
      scrollEnabled={scrollEnabled}
      showsVerticalScrollIndicator={false}
      style={[styles.scrollView, style]}>
      {children}
    </ScrollView>
  );
};

export default DeepLinkReviewScrollView;
