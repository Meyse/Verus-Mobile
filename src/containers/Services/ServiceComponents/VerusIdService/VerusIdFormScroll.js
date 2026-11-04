import React, {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {View} from 'react-native';

export const VerusIdFormScrollContext = createContext(null);

// Scoped to the registration and management forms. KeyboardAvoidingForm owns
// keyboard avoidance; this follows WizardFormLayout's measured reveal and
// footer reserve without changing other consumers of the shared scroll views.
export function useVerusIdFormScroll(keyboardVisible) {
  const scrollRef = useRef(null);
  const focusedField = useRef(null);
  const viewportHeight = useRef(0);
  const revealFrame = useRef(null);
  const [footerHeight, setFooterHeight] = useState(0);
  const reveal = useCallback(() => {
    if (revealFrame.current != null) cancelAnimationFrame(revealFrame.current);
    if (!keyboardVisible) return;
    revealFrame.current = requestAnimationFrame(() => {
      revealFrame.current = null;
      const field = focusedField.current;
      const content = scrollRef.current?.getInnerViewNode();
      if (!field || !content || viewportHeight.current <= 0) return;
      field.group.measureLayout(content, (_x, y, _width, height) => {
        const scroll = inputTop => {
          if (focusedField.current !== field) return;
          // Labels may scroll above the viewport. Keep the editable field
          // itself visible together with its status/help/risk line.
          scrollRef.current?.scrollTo({
            y: Math.max(0, Math.min(inputTop, y + height + 12 - viewportHeight.current)),
            animated: false,
          });
        };
        if (field.input?.measureLayout)
          field.input.measureLayout(content, (_inputX, inputY) => scroll(inputY - 1), () => scroll(y));
        else scroll(y);
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
    onFooterLayout: event => {setFooterHeight(event.nativeEvent.layout.height); reveal();},
    keyboardPadding: keyboardVisible ? {paddingBottom: footerHeight + 24} : null,
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
