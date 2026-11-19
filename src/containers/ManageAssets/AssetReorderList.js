import React, {useCallback, useLayoutEffect, useMemo, useState} from 'react';
import {Platform, StyleSheet, View} from 'react-native';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  runOnUI,
  scrollTo,
  useAnimatedRef,
  useAnimatedStyle,
  useFrameCallback,
  useScrollViewOffset,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {GripVertical} from 'lucide-react-native';
import {useOnboardingTheme} from '../../theme/onboarding';
import {triggerLightHaptic} from '../../utils/haptics/haptics';

// "My order" in Manage assets (PR 266 review R2, owner pick B, 2026-11-19).
// Each row has a drag handle. The rows stay in normal flow; during a drag
// they only move by transforms, so rows of any height work. The list scrolls
// by itself while the row is held near the top or bottom edge.

const EDGE = 56;
const MAX_STEP = 10;
const SHIFT_TIMING = {duration: 160};
const DROP_TIMING = {duration: 140};

// The scroll view, its offset and size for the list inside it.
export const useReorderScroll = () => {
  const ref = useAnimatedRef();
  const offset = useScrollViewOffset(ref);
  const viewport = useSharedValue(0);
  const content = useSharedValue(0);
  const [enabled, setEnabled] = useState(true);
  // One object for the whole screen life, so the drag gestures keep their
  // configuration while scrolling turns off and on.
  const scroll = useMemo(() => ({ref, offset, viewport, content, setEnabled}),
    [ref, offset, viewport, content]);
  return [scroll, enabled];
};

// The index the held row goes to: the number of other rows whose middle is
// above the held row's middle.
const targetIndex = (keys, layouts, id, dragY) => {
  'worklet';
  const me = layouts[id];
  if (!me) return keys.indexOf(id);
  const center = me.y + me.h / 2 + dragY;
  let index = 0;
  for (let i = 0; i < keys.length; i += 1) {
    const key = keys[i];
    if (key === id) continue;
    const other = layouts[key];
    if (other && center > other.y + other.h / 2) index += 1;
  }
  return index;
};

// How far the held row moves to stand in its new place.
const slotOffset = (keys, layouts, from, to) => {
  'worklet';
  let sum = 0;
  if (to > from) for (let i = from + 1; i <= to; i += 1) sum += layouts[keys[i]]?.h || 0;
  else for (let i = to; i < from; i += 1) sum -= layouts[keys[i]]?.h || 0;
  return sum;
};

// Every row reports its place. The merge runs on the UI thread: a merge on
// the JS thread reads an old copy of the map, so the rows overwrite each
// other and the drag finds no place to move to.
const storeLayout = (layouts, id, y, h) => {
  'worklet';
  const current = layouts.value[id];
  if (current?.y === y && current?.h === h) return;
  layouts.value = {...layouts.value, [id]: {y, h}};
};

const ReorderRow = ({id, index, drag, children}) => {
  const theme = useOnboardingTheme();
  const {active, from, target, dragY, layouts} = drag;
  const style = useAnimatedStyle(() => {
    const held = active.value === id;
    if (held) return {transform: [{translateY: dragY.value}], zIndex: 2};
    if (active.value == null) return {transform: [{translateY: 0}], zIndex: 0};
    const a = from.value;
    const t = target.value;
    const h = layouts.value[active.value]?.h || 0;
    const shift = a < t && index > a && index <= t ? -h
      : t < a && index >= t && index < a ? h : 0;
    return {transform: [{translateY: withTiming(shift, SHIFT_TIMING)}], zIndex: 0};
  }, [id, index]);
  // The held row lifts onto a raised surface, as in the approved mockup.
  const lift = useAnimatedStyle(() => ({opacity: withTiming(active.value === id ? 1 : 0, SHIFT_TIMING)}), [id]);

  return (
    <Animated.View
      style={style}
      onLayout={event => {
        const {y, height} = event.nativeEvent.layout;
        runOnUI(storeLayout)(layouts, id, y, height);
      }}>
      <Animated.View
        pointerEvents="none"
        style={[styles.lift, {
          backgroundColor: theme.isDark ? theme.colors.surfaceRaised : theme.colors.surface,
          // Android elevation would draw the surface over the row, so Android
          // shows a hairline outline in place of the shadow.
          ...(Platform.OS === 'android'
            ? {borderWidth: StyleSheet.hairlineWidth * 2, borderColor: theme.colors.borderStrong}
            : {shadowColor: theme.isDark ? '#000000' : '#080E1C', shadowOpacity: theme.isDark ? 0.4 : 0.14}),
        }, lift]}
      />
      {children}
    </Animated.View>
  );
};

// The drag handle. Screen readers get Move up and Move down instead of a drag.
export const DragHandle = ({id, label, index, count, drag, enabled, onMoveBy}) => {
  const theme = useOnboardingTheme();
  const {active, from, target, dragY, layouts, order, scroll, start, stop, commit} = drag;
  const gesture = useMemo(() => Gesture.Pan()
    .enabled(enabled)
    .minDistance(2)
    .onBegin(() => { runOnJS(scroll.setEnabled)(false); })
    .onStart(() => {
      const keys = order.value;
      active.value = id;
      from.value = keys.indexOf(id);
      target.value = keys.indexOf(id);
      drag.startOffset.value = scroll.offset.value;
      drag.scrollPos.value = scroll.offset.value;
      drag.translation.value = 0;
      dragY.value = 0;
      runOnJS(start)();
      runOnJS(triggerLightHaptic)();
    })
    .onUpdate(event => {
      if (active.value !== id) return;
      drag.translation.value = event.translationY;
      dragY.value = event.translationY + drag.scrollPos.value - drag.startOffset.value;
      target.value = targetIndex(order.value, layouts.value, id, dragY.value);
    })
    .onEnd(() => {
      if (active.value !== id) return;
      const a = from.value;
      const t = target.value;
      dragY.value = withTiming(slotOffset(order.value, layouts.value, a, t), DROP_TIMING, finished => {
        if (finished) runOnJS(commit)(id, t);
      });
    })
    .onFinalize(() => {
      runOnJS(stop)();
      runOnJS(scroll.setEnabled)(true);
    }), [active, commit, drag, dragY, enabled, from, id, layouts, order, scroll, start, stop, target]);

  const actions = [
    ...(index > 0 ? [{name: 'moveUp', label: 'Move up'}] : []),
    ...(index < count - 1 ? [{name: 'moveDown', label: 'Move down'}] : []),
  ];

  return (
    <GestureDetector gesture={gesture}>
      <View
        accessible
        accessibilityLabel={`Reorder ${label}`}
        accessibilityHint="Drag to change the order on Home."
        accessibilityActions={enabled ? actions : []}
        accessibilityState={{disabled: !enabled}}
        onAccessibilityAction={event => {
          if (!enabled) return;
          if (event.nativeEvent.actionName === 'moveUp') onMoveBy(id, -1);
          if (event.nativeEvent.actionName === 'moveDown') onMoveBy(id, 1);
        }}
        hitSlop={{top: 0, bottom: 0, left: 8, right: 4}}
        style={styles.handle}
        testID={`asset-drag-handle-${id}`}>
        <GripVertical size={20} strokeWidth={2} color={enabled ? theme.colors.textSubtle : theme.colors.disabledText} />
      </View>
    </GestureDetector>
  );
};

// keys: the full "My order" of the rows shown. renderRow(key, handle) draws one row.
const AssetReorderList = ({keys, scroll, onReorder, renderRow, enabled = true}) => {
  const active = useSharedValue(null);
  const from = useSharedValue(-1);
  const target = useSharedValue(-1);
  const dragY = useSharedValue(0);
  const translation = useSharedValue(0);
  const startOffset = useSharedValue(0);
  const scrollPos = useSharedValue(0);
  const layouts = useSharedValue({});
  const listY = useSharedValue(0);
  const order = useSharedValue(keys);
  const orderKey = keys.join('\n');

  // The new order is drawn: the rows stand in their places without transforms.
  useLayoutEffect(() => {
    order.value = keys;
    active.value = null;
    from.value = -1;
    target.value = -1;
    dragY.value = 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the key stands for the keys.
  }, [orderKey]);

  // Scrolls while the held row is near an edge. The user cannot scroll during
  // a drag, so this position is the scroll view's position.
  const autoScroll = useFrameCallback(() => {
    const id = active.value;
    if (id == null) return;
    const me = layouts.value[id];
    if (!me) return;
    const top = listY.value + me.y + dragY.value - scrollPos.value;
    const bottom = top + me.h;
    const max = Math.max(0, scroll.content.value - scroll.viewport.value);
    let step = 0;
    if (top < EDGE && scrollPos.value > 0) {
      step = -Math.min(MAX_STEP, scrollPos.value, Math.ceil((EDGE - top) / 4));
    } else if (bottom > scroll.viewport.value - EDGE && scrollPos.value < max) {
      step = Math.min(MAX_STEP, max - scrollPos.value, Math.ceil((bottom - scroll.viewport.value + EDGE) / 4));
    }
    if (step === 0) return;
    scrollPos.value += step;
    scrollTo(scroll.ref, 0, scrollPos.value, false);
    dragY.value = translation.value + scrollPos.value - startOffset.value;
    target.value = targetIndex(order.value, layouts.value, id, dragY.value);
  }, false);

  const start = useCallback(() => autoScroll.setActive(true), [autoScroll]);
  const stop = useCallback(() => autoScroll.setActive(false), [autoScroll]);
  const commit = useCallback((id, to) => {
    const current = order.value;
    const fromIndex = current.indexOf(id);
    if (fromIndex < 0 || fromIndex === to) {
      active.value = null;
      dragY.value = 0;
      return;
    }
    const next = [...current];
    next.splice(fromIndex, 1);
    next.splice(to, 0, id);
    // The rows stay in their new places until the new order draws. When the
    // order is not saved, they go back to the old places.
    Promise.resolve(onReorder(next)).catch(() => {
      active.value = null;
      dragY.value = 0;
    });
  }, [active, dragY, onReorder, order]);

  const moveBy = useCallback((id, step) => {
    const fromIndex = keys.indexOf(id);
    const to = fromIndex + step;
    if (fromIndex < 0 || to < 0 || to >= keys.length) return;
    const next = [...keys];
    next.splice(fromIndex, 1);
    next.splice(to, 0, id);
    Promise.resolve(onReorder(next)).catch(() => {});
  }, [keys, onReorder]);

  const drag = useMemo(() => ({
    active, from, target, dragY, translation, startOffset, scrollPos, layouts, order, scroll, start, stop, commit,
  }), [active, commit, dragY, from, layouts, order, scroll, scrollPos, start, startOffset, stop, target, translation]);

  return (
    <View onLayout={event => { listY.value = event.nativeEvent.layout.y; }}>
      {keys.map((key, index) => (
        <ReorderRow key={key} id={key} index={index} drag={drag}>
          {renderRow(key, ({label}) => (
            <DragHandle id={key} label={label} index={index} count={keys.length} drag={drag}
              enabled={enabled} onMoveBy={moveBy} />
          ))}
        </ReorderRow>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  lift: {
    ...StyleSheet.absoluteFillObject,
    left: -8,
    right: -8,
    borderRadius: 16,
    shadowOffset: {width: 0, height: 6},
    shadowRadius: 16,
  },
  handle: {width: 28, alignSelf: 'stretch', alignItems: 'flex-start', justifyContent: 'center'},
});

export default AssetReorderList;
