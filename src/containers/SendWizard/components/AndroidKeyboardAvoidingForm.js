import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Keyboard, StyleSheet, View} from 'react-native';

// Re-read the keyboard a few times after an event or a layout. A show event can
// arrive before the first layout, and the keyboard can resize right after it.
const RESYNC_DELAYS_MS = [60, 160, 360, 760, 1500];

// Only the inner content contracts. The outer onLayout frame stays independent
// of keyboard padding. Use the same parent coordinates and header offset as
// KeyboardAvoidingView, without its state.bottom/contracted-frame feedback.
const AndroidKeyboardAvoidingForm = ({
  children,
  keyboardVerticalOffset = 0,
  style,
}) => {
  const frameRef = useRef(null);
  const keyboardFrameRef = useRef(null);
  const offsetRef = useRef(keyboardVerticalOffset);
  const timersRef = useRef([]);
  const [bottom, setBottom] = useState(0);

  offsetRef.current = keyboardVerticalOffset;

  const updateOverlap = useCallback(() => {
    const frame = frameRef.current;
    const keyboard = keyboardFrameRef.current;
    setBottom(
      frame && keyboard
        ? Math.max(
            0,
            frame.y + frame.height + offsetRef.current - keyboard.screenY,
          )
        : 0,
    );
  }, []);

  const resync = useCallback(() => {
    keyboardFrameRef.current = Keyboard.metrics() || null;
    updateOverlap();
  }, [updateOverlap]);

  const scheduleResync = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = RESYNC_DELAYS_MS.map(delay =>
      setTimeout(resync, delay),
    );
  }, [resync]);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', event => {
      keyboardFrameRef.current = event.endCoordinates;
      updateOverlap();
      scheduleResync();
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      keyboardFrameRef.current = null;
      setBottom(0);
      scheduleResync();
    });

    // Recipient can mount while Amount's keyboard is already open.
    resync();
    scheduleResync();

    return () => {
      show.remove();
      hide.remove();
      timersRef.current.forEach(clearTimeout);
    };
  }, [resync, scheduleResync, updateOverlap]);

  useEffect(() => {
    updateOverlap();
  }, [keyboardVerticalOffset, updateOverlap]);

  return (
    <View
      onLayout={event => {
        frameRef.current = event.nativeEvent.layout;
        updateOverlap();
        scheduleResync();
      }}
      style={style}>
      <View style={[styles.content, {paddingBottom: bottom}]}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({content: {flex: 1}});

export default AndroidKeyboardAvoidingForm;
