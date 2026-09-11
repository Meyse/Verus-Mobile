import React, {useMemo} from 'react';
import {Text, TouchableOpacity, View} from 'react-native';
import {Check} from 'lucide-react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import BottomSheetModal from './BottomSheetModal';
import SheetScrollView from './SheetScrollView';
import {
  createSignedOutSheetStyles,
  createSelectionSheetStyles,
} from '../styles';
import {useOnboardingTheme} from '../theme/onboarding';

export const SelectionRow = ({
  title,
  subtitle,
  titleMonospace,
  subtitleMonospace,
  selected,
  onPress,
  value,
  valueLabel,
  leading,
  accessibilityLabel,
}) => {
  const theme = useOnboardingTheme();
  const styles = useMemo(() => createSelectionSheetStyles(theme), [theme]);
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={
        accessibilityLabel ||
        [title, subtitle, value, valueLabel]
          .filter(item => item != null && item !== '')
          .join(', ')
      }
      accessibilityState={selected == null ? undefined : {selected}}
      activeOpacity={0.74}
      onPress={onPress}
      style={[styles.row, selected && styles.selectedRow]}>
      {leading ? <View style={styles.leading}>{leading}</View> : null}
      <View style={styles.copy}>
        <Text style={[styles.rowTitle, titleMonospace && styles.identifier]}>
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={[
              styles.rowSubtitle,
              subtitleMonospace && styles.identifier,
            ]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {value != null ? (
        <View style={styles.value}>
          <Text style={styles.valueText}>{value}</Text>
          {valueLabel ? (
            <Text style={styles.valueLabel}>{valueLabel}</Text>
          ) : null}
        </View>
      ) : null}
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={styles.indicator}>
        {selected ? (
          <Check color={theme.colors.success} size={20} strokeWidth={2.4} />
        ) : (
          <MaterialCommunityIcons
            name="chevron-right"
            size={20}
            color={theme.colors.textSubtle}
          />
        )}
      </View>
    </TouchableOpacity>
  );
};

export const SelectionGroup = ({title, children}) => {
  const theme = useOnboardingTheme();
  const styles = useMemo(() => createSelectionSheetStyles(theme), [theme]);
  return (
    <View style={styles.group}>
      <Text style={styles.groupTitle}>{title}</Text>
      {children}
    </View>
  );
};

export const SelectionAction = ({title, onPress}) => {
  const theme = useOnboardingTheme();
  const styles = useMemo(() => createSelectionSheetStyles(theme), [theme]);
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={title}
      activeOpacity={0.74}
      onPress={onPress}
      style={styles.action}>
      <Text style={styles.actionText}>{title}</Text>
      <MaterialCommunityIcons
        name="chevron-right"
        size={22}
        color={theme.colors.textSubtle}
      />
    </TouchableOpacity>
  );
};

const SelectionSheet = ({
  children,
  title,
  subtitle,
  header,
  footer,
  visible,
  onClose,
  onClosed,
  avoidKeyboard = false,
  fillHeight = false,
  maxHeight = '76%',
  listProps,
}) => {
  const theme = useOnboardingTheme();
  const styles = useMemo(() => createSelectionSheetStyles(theme), [theme]);
  const bodyStyles = useMemo(() => createSignedOutSheetStyles(theme), [theme]);
  return (
    <BottomSheetModal
      visible={visible}
      onClose={onClose}
      onClosed={onClosed}
      avoidKeyboard={avoidKeyboard}
      maxHeight={maxHeight}
      contentContainerStyle={fillHeight ? {height: maxHeight} : undefined}>
      <View
        style={[
          bodyStyles.body,
          bodyStyles.bodyShort,
          styles.body,
          fillHeight && styles.fill,
        ]}
        onAccessibilityEscape={onClose}>
        <View style={styles.header}>
          <Text accessibilityRole="header" style={styles.title}>
            {title}
          </Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {header ? <View style={styles.headerContent}>{header}</View> : null}
        <SheetScrollView
          fill={fillHeight}
          listProps={listProps}
          contentContainerStyle={bodyStyles.listContent}>
          {children}
        </SheetScrollView>
        {footer}
      </View>
    </BottomSheetModal>
  );
};

export default SelectionSheet;
