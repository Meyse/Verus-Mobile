import React, {createContext, useCallback, useContext, useEffect, useMemo, useRef} from 'react';
import {View} from 'react-native';

export const VerusIdFormScrollContext = createContext(null);

// Scoped to the registration and management forms. KeyboardAvoidingForm owns
// keyboard avoidance; this measures the focused field group and reserves the
// scroll cue without changing other consumers of the shared scroll views.
export function useVerusIdFormScroll(keyboardVisible) {
  const scrollRef = useRef(null);
  const focusedField = useRef(null);
  const viewportHeight = useRef(0);
  const revealFrame = useRef(null);
  const reveal = useCallback(() => {
    if (revealFrame.current != null) cancelAnimationFrame(revealFrame.current);
    if (!keyboardVisible) return;
    revealFrame.current = requestAnimationFrame(() => {
      revealFrame.current = null;
      const field = focusedField.current;
      const content = scrollRef.current?.getInnerViewNode();
      if (!field || !content || viewportHeight.current <= 0) return;
      field.group.measureLayout(content, (_x, y, _width, height) => {
        if (focusedField.current !== field) return;
        // Reveal the whole group when it fits. For a taller group, keep its
        // label at the top and let the user scroll to the supporting text.
        scrollRef.current?.scrollTo({
          y: Math.max(0, Math.min(y, y + height + 12 - viewportHeight.current)),
          animated: false,
        });
      }, () => {});
    });
  }, [keyboardVisible]);
  useEffect(() => {
    reveal();
    return () => {
      if (revealFrame.current != null) cancelAnimationFrame(revealFrame.current);
    };
  }, [reveal]);
  const blur = useCallback(group => {
    if (focusedField.current?.group === group) focusedField.current = null;
  }, []);
  const context = useMemo(() => ({
    focus: (group, input) => {focusedField.current = {group, input}; reveal();},
    blur,
    reveal,
  }), [blur, reveal]);
  return {
    context,
    scrollRef,
    onLayout: event => {viewportHeight.current = event.nativeEvent.layout.height; reveal();},
    onContentSizeChange: reveal,
    onFooterLayout: reveal,
    // The footer is a non-shrinking sibling, outside the clipped viewport.
    // Reserve only the scroll cue, not a second copy of the footer's height.
    keyboardPadding: keyboardVisible ? {paddingBottom: 48} : null,
  };
}

// Keep the supporting line in this wrapper so its native layout is measured
// with the input. Focus still belongs to the actual native field.
export function VerusIdFormField({children, ...props}) {
  const context = useContext(VerusIdFormScrollContext);
  const fieldRef = useRef(null);
  const inputRef = useRef(null);
  const blur = context?.blur;
  useEffect(() => {
    const field = fieldRef.current;
    return () => blur?.(field);
  }, [blur]);
  return <View {...props} ref={fieldRef} collapsable={false} onLayout={context?.reveal}>
    {children({
      ref: inputRef,
      onFocus: () => context?.focus(fieldRef.current, inputRef.current),
      onBlur: () => context?.blur(fieldRef.current),
    })}
  </View>;
}
