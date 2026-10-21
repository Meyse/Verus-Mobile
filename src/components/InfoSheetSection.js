import React, {useMemo} from 'react';
import {View} from 'react-native';
import {Text} from 'react-native-paper';
import CopyAction from './CopyAction';
import {deepLinkRequestReviewStyles as createDeepLinkRequestReviewStyles} from '../styles';
import {useOnboardingTheme} from '../theme/onboarding';

// `copy` adds the shared copy button beside the row. It copies `copyValue`
// when the shown value differs from the text to copy.
export const InfoSheetRow = ({
  copy = false,
  copyValue,
  ellipsizeMode,
  label,
  numberOfLines,
  selectable = true,
  value,
  valueStyle,
}) => {
  const theme = useOnboardingTheme();
  const styles = useMemo(
    () => createDeepLinkRequestReviewStyles(theme),
    [theme],
  );

  if (value == null) return null;

  const text = (
    <>
      <Text style={styles.requestInfoLabel}>{label}</Text>
      <Text
        ellipsizeMode={ellipsizeMode}
        numberOfLines={numberOfLines}
        selectable={selectable}
        style={[styles.requestInfoValue, valueStyle]}>
        {value}
      </Text>
    </>
  );

  if (!copy) return <View style={styles.requestInfoRow}>{text}</View>;

  return (
    <View style={[styles.requestInfoRow, styles.requestInfoRowWithAction]}>
      <View style={styles.requestInfoRowText}>{text}</View>
      <CopyAction
        accessibilityLabel={`Copy ${label.toLowerCase()}`}
        copiedAccessibilityLabel={`${label} copied`}
        value={copyValue ?? value}
      />
    </View>
  );
};

const InfoSheetSection = ({rows = [], title}) => {
  const theme = useOnboardingTheme();
  const styles = useMemo(
    () => createDeepLinkRequestReviewStyles(theme),
    [theme],
  );
  const visibleRows = rows.filter(row => row && row.value != null);

  if (visibleRows.length === 0) return null;

  return (
    <View style={styles.requestInfoSection}>
      <Text style={styles.requestInfoSectionTitle}>{title}</Text>
      <View style={styles.requestInfoRows}>
        {visibleRows.map((row, index) => (
          <InfoSheetRow
            key={`${title}-${row.label}-${index}`}
            label={row.label}
            selectable={row.selectable}
            value={row.value}
          />
        ))}
      </View>
    </View>
  );
};

export default InfoSheetSection;
