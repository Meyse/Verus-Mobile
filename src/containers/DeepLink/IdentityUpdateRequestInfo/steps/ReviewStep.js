/*
  ReviewStep (Step 1)
  - Overview-only identity update request review.
*/
import React, {useState} from 'react';
import {View} from 'react-native';
import {Text} from 'react-native-paper';
import {
  DeepLinkRequestSourceCard,
  DeepLinkReviewScrollView,
  DeepLinkVerusIdDetailsSheet,
} from '../../components/RequestReview';

const ReviewStep = ({
  canOpenSignerDetails,
  loadSignerFriendlyNames,
  loadSignerVerusId,
  requesterLabel,
  requesterMetadataRows,
  styles,
}) => {
  const [verusIdDetailsSheetVisible, setVerusIdDetailsSheetVisible] =
    useState(false);

  return (
    <>
      <DeepLinkVerusIdDetailsSheet
        visible={verusIdDetailsSheetVisible}
        onClose={() => setVerusIdDetailsSheetVisible(false)}
        loadVerusId={loadSignerVerusId}
        loadFriendlyNames={loadSignerFriendlyNames}
      />
      <DeepLinkReviewScrollView>
        <View style={styles.header}>
          <Text style={styles.mainTitle}>Review VerusID changes</Text>
        </View>

        <DeepLinkRequestSourceCard
          metadataRows={requesterMetadataRows}
          onPressRequester={
            canOpenSignerDetails
              ? () => setVerusIdDetailsSheetVisible(true)
              : undefined
          }
          requesterAccessibilityHint="View VerusID details"
          requesterLabel={requesterLabel}
          showRequestDetailsLink={false}
        />
        <View style={{height: 24}} />
      </DeepLinkReviewScrollView>
    </>
  );
};

export default ReviewStep;
