import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ScrollView,
  useWindowDimensions,
  View,
} from 'react-native';
import {Text} from 'react-native-paper';
import Svg, {Defs, LinearGradient, Rect, Stop} from 'react-native-svg';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AppButton from '../../../../components/AppButton';
import BottomSheetModal from '../../../../components/BottomSheetModal';
import {
  deepLinkRequestReviewStyles as createDeepLinkRequestReviewStyles,
} from '../../../../styles';
import {useOnboardingTheme} from '../../../../theme/onboarding';

const SCROLL_END_THRESHOLD = 8;

const EMPTY_SCROLL_METRICS = {
  contentHeight: 0,
  layoutHeight: 0,
  offsetY: 0,
};

const hasSameScrollMetrics = (left, right) =>
  left.contentHeight === right.contentHeight &&
  left.layoutHeight === right.layoutHeight &&
  left.offsetY === right.offsetY;

export const RequestSheetScrollCue = ({styles, theme, backgroundColor = theme.colors.sheet}) => (
  <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.requestSheetScrollCue}>
    <Svg width="100%" height="100%">
      <Defs>
        <LinearGradient
          id="requestSheetBottomScrollCue"
          x1="0"
          x2="0"
          y1="0"
          y2="1">
          <Stop offset="0" stopColor={backgroundColor} stopOpacity="0" />
          <Stop
            offset="0.72"
            stopColor={backgroundColor}
            stopOpacity="0.92"
          />
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

const DeepLinkRequestSheetScaffold = ({
  children,
  maxHeight = '78%',
  onClose,
  onClosed,
  subtitle,
  title,
  visible,
}) => {
  const theme = useOnboardingTheme();
  const {height} = useWindowDimensions();
  const [scrollMetrics, setScrollMetrics] = useState(EMPTY_SCROLL_METRICS);
  const styles = useMemo(
    () => createDeepLinkRequestReviewStyles(theme),
    [theme],
  );
  const numericMaxHeight = useMemo(() => {
    if (typeof maxHeight === 'number') return maxHeight;
    if (typeof maxHeight !== 'string' || !maxHeight.endsWith('%')) return null;

    const percentage = Number(maxHeight.replace('%', ''));
    if (!Number.isFinite(percentage)) return null;

    return Math.max(0, height * (percentage / 100) - 10);
  }, [height, maxHeight]);
  const showBottomScrollCue =
    visible &&
    scrollMetrics.layoutHeight > 0 &&
    scrollMetrics.contentHeight >
      scrollMetrics.layoutHeight + SCROLL_END_THRESHOLD &&
    scrollMetrics.offsetY + scrollMetrics.layoutHeight <
      scrollMetrics.contentHeight - SCROLL_END_THRESHOLD;

  useEffect(() => {
    if (!visible) {
      setScrollMetrics(EMPTY_SCROLL_METRICS);
    }
  }, [visible]);

  const updateScrollMetrics = useCallback(nextMetrics => {
    setScrollMetrics(current => {
      const next = {
        ...current,
        ...nextMetrics,
      };

      return hasSameScrollMetrics(current, next) ? current : next;
    });
  }, []);

  const handleScroll = useCallback(
    event => {
      const {contentOffset, contentSize, layoutMeasurement} = event.nativeEvent;

      updateScrollMetrics({
        contentHeight: contentSize.height,
        layoutHeight: layoutMeasurement.height,
        offsetY: contentOffset.y,
      });
    },
    [updateScrollMetrics],
  );

  return (
    <BottomSheetModal
      visible={visible}
      onClose={onClose}
      onClosed={onClosed}
      maxHeight={maxHeight}>
      <View
        style={[
          styles.requestSheetBody,
          numericMaxHeight != null && {maxHeight: numericMaxHeight},
        ]}>
        <View style={styles.requestSheetHeader}>
          <View style={styles.requestSheetHeaderText}>
            <Text style={styles.requestSheetTitle}>{title}</Text>
            {subtitle ? (
              <Text style={styles.requestSheetSubtitle}>{subtitle}</Text>
            ) : null}
          </View>
        </View>
        <View style={styles.requestSheetScrollFrame}>
          <ScrollView
            alwaysBounceVertical={false}
            bounces={false}
            style={styles.requestSheetScroll}
            contentContainerStyle={styles.requestSheetContent}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={(_, contentHeight) =>
              updateScrollMetrics({contentHeight})
            }
            onLayout={event =>
              updateScrollMetrics({
                layoutHeight: event.nativeEvent.layout.height,
              })
            }
            onScroll={handleScroll}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
          {showBottomScrollCue && (
            <RequestSheetScrollCue styles={styles} theme={theme} />
          )}
        </View>
        <AppButton
          accessibilityLabel="Done"
          height={56}
          onPress={onClose}
          style={styles.requestSheetActionButton}
          variant="secondary">
          Done
        </AppButton>
      </View>
    </BottomSheetModal>
  );
};

export default DeepLinkRequestSheetScaffold;
