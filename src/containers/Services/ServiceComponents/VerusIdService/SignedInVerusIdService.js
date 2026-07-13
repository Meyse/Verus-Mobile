import React from 'react';
import {ScrollView, View} from 'react-native';
import {Button, Text} from 'react-native-paper';
import {useSelector} from 'react-redux';
import {SafeAreaView} from 'react-native-safe-area-context';
import SkeletonLoader, {SkeletonSection} from '../../../../components/SkeletonLoader';
import signedInCopy from '../../../../copy/signedIn';
import {createSignedInStyles} from '../../../../styles';
import {useOnboardingTheme} from '../../../../theme/onboarding';
import {CoinDirectory} from '../../../../utils/CoinData/CoinDirectory';
import {openLinkIdentityModal} from '../../../../actions/actions/sendModal/dispatchers/sendModal';
import {VERUSID_NETWORK_DEFAULT} from '../../../../../env/index';
import VerusIdServiceOverview from './VerusIdServiceOverview/VerusIdServiceOverview';

const SignedInVerusIdService = ({controller}) => {
  const theme = useOnboardingTheme();
  const styles = createSignedInStyles(theme);
  const testnetOverrides = useSelector(
    state => state.authentication.activeAccount.testnetOverrides,
  );
  const identityNetwork =
    testnetOverrides[VERUSID_NETWORK_DEFAULT] || VERUSID_NETWORK_DEFAULT;
  const linkedIds = controller.state.linkedIds;
  const loading = controller.props.loading || linkedIds == null;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeScreen}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>{signedInCopy.identity.title}</Text>
        <Text style={styles.subtitle}>{signedInCopy.identity.description}</Text>
        {loading ? (
          <SkeletonLoader
            accessibilityLabel="Loading linked VerusIDs"
            style={{marginTop: theme.spacing.lg}}>
            <SkeletonSection rows={3} />
          </SkeletonLoader>
        ) : Object.keys(linkedIds).length > 0 ? (
          <View style={{marginTop: theme.spacing.lg}}>
            <VerusIdServiceOverview
              navigation={controller.props.navigation}
              linkedIds={linkedIds}
            />
          </View>
        ) : (
          <View
            style={[
              styles.surface,
              {
                marginTop: theme.spacing.lg,
                padding: theme.spacing.lg,
                alignItems: 'center',
              },
            ]}>
            <Text style={styles.rowTitle}>No linked VerusIDs</Text>
            <Text style={[styles.rowDescription, {textAlign: 'center'}]}>
              Link a VerusID controlled by this wallet to sign in to services
              and manage identity-held assets.
            </Text>
            <Button
              mode="contained"
              icon="link-variant"
              style={{marginTop: theme.spacing.lg}}
              contentStyle={{minHeight: 52}}
              onPress={() =>
                openLinkIdentityModal(CoinDirectory.findCoinObj(identityNetwork))
              }>
              Link VerusID
            </Button>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default SignedInVerusIdService;
