import React, {useMemo} from 'react';
import {TouchableOpacity, View} from 'react-native';
import {Text} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  deepLinkRequestReviewStyles as createDeepLinkRequestReviewStyles,
} from '../../../../styles';
import {useOnboardingTheme} from '../../../../theme/onboarding';

const DeepLinkRequestSourceCard = ({
  metadataRows = [],
  onPressRequestDetails,
  onPressRequester,
  requesterAccessibilityHint,
  requesterLabel,
  showRequestDetailsLink = false,
}) => {
  const theme = useOnboardingTheme();
  const styles = useMemo(
    () => createDeepLinkRequestReviewStyles(theme),
    [theme],
  );
  const requesterPressEnabled = typeof onPressRequester === 'function';
  const detailsPressEnabled =
    showRequestDetailsLink && typeof onPressRequestDetails === 'function';

  return (
    <View style={styles.requesterCard}>
      <Text style={styles.requesterLabel}>Request from</Text>
      <TouchableOpacity
        accessibilityHint={
          requesterPressEnabled ? requesterAccessibilityHint : undefined
        }
        accessibilityLabel={`Request from ${requesterLabel}`}
        accessibilityRole="button"
        activeOpacity={requesterPressEnabled ? 0.74 : 1}
        disabled={!requesterPressEnabled}
        onPress={requesterPressEnabled ? onPressRequester : undefined}
        style={styles.requesterIdentityPanel}>
        <View style={styles.requesterTextContainer}>
          <Text numberOfLines={1} style={styles.requesterName}>
            {requesterLabel}
          </Text>
        </View>
        {requesterPressEnabled && (
          <MaterialCommunityIcons
            name="chevron-right"
            size={22}
            color={theme.colors.textSubtle}
          />
        )}
      </TouchableOpacity>
      {metadataRows.length > 0 && (
        <View style={styles.requesterDetailsList}>
          {metadataRows.map((row, index) => (
            <View
              key={row.label}
              style={[
                styles.requesterDetailRow,
                index > 0 && styles.requesterDetailRowDivider,
              ]}>
              <Text style={styles.requesterDetailLabel}>{row.label}</Text>
              <Text numberOfLines={1} style={styles.requesterDetailValue}>
                {row.value}
              </Text>
            </View>
          ))}
        </View>
      )}
      {detailsPressEnabled && (
        <TouchableOpacity
          accessibilityRole="button"
          activeOpacity={0.78}
          onPress={onPressRequestDetails}
          style={styles.requestDetailsLinkTouch}>
          <Text numberOfLines={1} style={styles.requestDetailsLinkText}>
            View request details
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export default DeepLinkRequestSourceCard;
