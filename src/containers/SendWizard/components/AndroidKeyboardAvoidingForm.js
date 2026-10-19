import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Keyboard, StyleSheet, View} from 'react-native';

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
  const [bottom, setBottom] = useState(0);

  const updateOverlap = useCallback(() => {
    const frame = frameRef.current;
    const keyboard = keyboardFrameRef.current;
    setBottom(
      frame && keyboard
        ? Math.max(
            0,
            frame.y + frame.height + keyboardVerticalOffset - keyboard.screenY,
          )
        : 0,
    );
  }, [keyboardVerticalOffset]);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', event => {
      keyboardFrameRef.current = event.endCoordinates;
      updateOverlap();
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      keyboardFrameRef.current = null;
      setBottom(0);
    });

    // Recipient can mount while Amount's keyboard is already open.
    keyboardFrameRef.current = Keyboard.metrics();
    updateOverlap();

    return () => {
      show.remove();
      hide.remove();
    };
  }, [updateOverlap]);

  return (
    <View
      onLayout={event => {
        frameRef.current = event.nativeEvent.layout;
        updateOverlap();
      }}
      style={style}>
      <View style={[styles.content, {paddingBottom: bottom}]}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({content: {flex: 1}});

export default AndroidKeyboardAvoidingForm;
