import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Clipboard, TouchableOpacity} from 'react-native';
import {Check, Copy} from 'lucide-react-native';
import {copyActionStyles as styles} from '../styles';
import {useOnboardingTheme} from '../theme/onboarding';

const getCopyText = value => {
  if (value == null) return '';
  return typeof value === 'string' ? value : String(value);
};

const CopyAction = ({
  accessibilityLabel = 'Copy',
  activeOpacity = 0.72,
  copiedAccessibilityLabel = 'Copied',
  copiedColor,
  color,
  disabled = false,
  iconSize = 20,
  onCopied,
  style,
  strokeWidth = 2,
  timeoutMs = 1400,
  value,
}) => {
  const theme = useOnboardingTheme();
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef(null);
  const copyText = getCopyText(value);
  const isDisabled = disabled || copyText.length === 0;
  const Icon = copied ? Check : Copy;

  useEffect(() => {
    setCopied(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, [copyText]);

  useEffect(
    () => () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    },
    [],
  );

  const handlePress = useCallback(() => {
    if (isDisabled) return;

    Clipboard.setString(copyText);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setCopied(true);
    if (typeof onCopied === 'function') onCopied(copyText);

    timeoutRef.current = setTimeout(() => {
      setCopied(false);
      timeoutRef.current = null;
    }, timeoutMs);
  }, [copyText, isDisabled, onCopied, timeoutMs]);

  return (
    <TouchableOpacity
      accessibilityLabel={
        copied ? copiedAccessibilityLabel : accessibilityLabel
      }
      accessibilityRole="button"
      activeOpacity={activeOpacity}
      disabled={isDisabled}
      onPress={handlePress}
      style={[
        styles.iconButton,
        isDisabled && styles.disabled,
        style,
      ]}>
      <Icon
        color={
          copied
            ? copiedColor || theme.colors.success
            : color || theme.colors.textSubtle
        }
        size={iconSize}
        strokeWidth={strokeWidth}
      />
    </TouchableOpacity>
  );
};

export default CopyAction;
