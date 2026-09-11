import React, {useMemo} from 'react';
import {View} from 'react-native';
import {Text} from 'react-native-paper';
import {deepLinkRequestReviewStyles as createDeepLinkRequestReviewStyles} from '../styles';
import {useOnboardingTheme} from '../theme/onboarding';

export const InfoSheetRow = ({label, selectable = true, value}) => {
  const theme = useOnboardingTheme();
  const styles = useMemo(
    () => createDeepLinkRequestReviewStyles(theme),
    [theme],
  );

  if (value == null) return null;

  return (
    <View style={styles.requestInfoRow}>
      <Text style={styles.requestInfoLabel}>{label}</Text>
      <Text selectable={selectable} style={styles.requestInfoValue}>
        {value}
      </Text>
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
