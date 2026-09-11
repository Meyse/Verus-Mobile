import React, {useCallback, useMemo, useState} from 'react';
import {FlatList, ScrollView, View} from 'react-native';
import Svg, {Defs, LinearGradient, Rect, Stop} from 'react-native-svg';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {deepLinkRequestReviewStyles} from '../styles';
import {useOnboardingTheme} from '../theme/onboarding';

const SCROLL_END_THRESHOLD = 8;
const MIN_FADE_VIEWPORT_HEIGHT = 128;

export const SheetScrollCue = ({
  styles,
  theme,
  backgroundColor = theme.colors.sheet,
}) => (
  <View
    pointerEvents="none"
    accessibilityElementsHidden
    importantForAccessibility="no-hide-descendants"
    style={styles.requestSheetScrollCue}>
    <Svg width="100%" height="100%">
      <Defs>
        <LinearGradient
          id="requestSheetBottomScrollCue"
          x1="0"
          x2="0"
          y1="0"
          y2="1">
          <Stop offset="0" stopColor={backgroundColor} stopOpacity="0" />
          <Stop offset="0.72" stopColor={backgroundColor} stopOpacity="0.92" />
          <Stop offset="1" stopColor={backgroundColor} stopOpacity="1" />
        </LinearGradient>
      </Defs>
      <Rect
        width="100%"
        height="100%"
        fill="url(#requestSheetBottomScrollCue)"
      />
    </Svg>
    <View style={styles.requestSheetScrollCueChevron}>
      <MaterialCommunityIcons
        name="chevron-down"
        size={15}
        color={theme.colors.textSubtle}
      />
    </View>
  </View>
);

// The scroll view unmounts with the sheet after closing, retaining its position
// and cue through the exit animation and starting fresh on the next opening.
const SheetScrollView = ({
  children,
  contentContainerStyle,
  fill = false,
  listProps,
}) => {
  const ScrollComponent = listProps ? FlatList : ScrollView;
  const theme = useOnboardingTheme();
  const styles = useMemo(() => deepLinkRequestReviewStyles(theme), [theme]);
  const [metrics, setMetrics] = useState({
    contentHeight: 0,
    layoutHeight: 0,
    offsetY: 0,
  });
  const update = useCallback(
    values =>
      setMetrics(current => {
        const next = {...current, ...values};
        return Object.keys(next).every(key => next[key] === current[key])
          ? current
          : next;
      }),
    [],
  );
  const showCue =
    metrics.layoutHeight >= MIN_FADE_VIEWPORT_HEIGHT &&
    metrics.contentHeight > metrics.layoutHeight + SCROLL_END_THRESHOLD &&
    metrics.offsetY + metrics.layoutHeight <
      metrics.contentHeight - SCROLL_END_THRESHOLD;

  return (
    <View style={[styles.requestSheetScrollFrame, fill && {flexGrow: 1}]}>
      <ScrollComponent
        {...listProps}
        alwaysBounceVertical={false}
        bounces={false}
        style={styles.requestSheetScroll}
        contentContainerStyle={[
          styles.requestSheetContent,
          contentContainerStyle,
        ]}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={(_, contentHeight) => update({contentHeight})}
        onLayout={event =>
          update({layoutHeight: event.nativeEvent.layout.height})
        }
        onScroll={({
          nativeEvent: {contentOffset, contentSize, layoutMeasurement},
        }) =>
          update({
            contentHeight: contentSize.height,
            layoutHeight: layoutMeasurement.height,
            offsetY: contentOffset.y,
          })
        }
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={
          metrics.layoutHeight < MIN_FADE_VIEWPORT_HEIGHT
        }>
        {listProps ? undefined : children}
      </ScrollComponent>
      {showCue ? <SheetScrollCue styles={styles} theme={theme} /> : null}
    </View>
  );
};

export default SheetScrollView;
