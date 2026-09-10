import React, {useMemo, useState} from 'react';
import {ScrollView, View} from 'react-native';
import {RequestSheetScrollCue} from './DeepLinkRequestSheetScaffold';
import {deepLinkRequestReviewStyles as createDeepLinkRequestReviewStyles} from '../../../../styles';
import {useOnboardingTheme} from '../../../../theme/onboarding';

const SCROLL_THRESHOLD = 48;

const DeepLinkReviewScrollView = ({
  children,
  contentContainerStyle,
  style,
  showScrollCue = false,
}) => {
  const theme = useOnboardingTheme();
  const styles = useMemo(
    () => createDeepLinkRequestReviewStyles(theme),
    [theme],
  );
  const [viewportHeight, setViewportHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const scrollEnabled =
    viewportHeight > 0 &&
    contentHeight > viewportHeight + (showScrollCue ? 8 : SCROLL_THRESHOLD);
  const showBottomCue =
    showScrollCue &&
    scrollEnabled &&
    offsetY + viewportHeight < contentHeight - 8;

  const content = (
    <ScrollView
      alwaysBounceVertical={false}
      bounces={false}
      contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
      onContentSizeChange={(_, height) => setContentHeight(height)}
      onLayout={event => setViewportHeight(event.nativeEvent.layout.height)}
      onScroll={
        showScrollCue
          ? event => setOffsetY(event.nativeEvent.contentOffset.y)
          : undefined
      }
      scrollEventThrottle={16}
      scrollEnabled={scrollEnabled}
      showsVerticalScrollIndicator={false}
      style={[styles.scrollView, style]}>
      {children}
    </ScrollView>
  );
  if (!showScrollCue) return content;
  return (
    <View style={styles.scrollView}>
      {content}
      {showBottomCue && (
        <RequestSheetScrollCue
          styles={styles}
          theme={theme}
          backgroundColor={theme.colors.background}
        />
      )}
    </View>
  );
};

export default DeepLinkReviewScrollView;
