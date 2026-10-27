/*
  ReviewStep (Step 1)
  - Overview-only identity update request review.
*/
import React, {useState} from 'react';
import IdentityStateChangeCard from '../components/IdentityStateChangeCard';
import {View} from 'react-native';
import {
  DeepLinkRequestSourceCard,
  DeepLinkReviewScrollView,
  DeepLinkVerusIdDetailsSheet,
  RequestTitle,
} from '../../components/RequestReview';

const ReviewStep = ({
  identityStateChange,
  canOpenSignerDetails,
  loadSignerFriendlyNames,
  loadSignerVerusId,
  requesterLabel,
  requesterMetadataRows,
  reviewDetails,
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
          <RequestTitle>Review VerusID changes</RequestTitle>
        </View>

        <DeepLinkRequestSourceCard
          style={reviewDetails ? {marginBottom: 0} : undefined}
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
        {reviewDetails}
        <IdentityStateChangeCard change={identityStateChange} />
        {!reviewDetails && <View style={{height: 24}} />}
      </DeepLinkReviewScrollView>
    </>
  );
};

export default ReviewStep;
