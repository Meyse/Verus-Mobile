import React from 'react';
import {TouchableOpacity, View} from 'react-native';
import {Button, List, Portal, Text} from 'react-native-paper';
import VerusIdDetailsModal from '../../../../../components/VerusIdDetailsModal/VerusIdDetailsModal';
import {createSignedInStyles} from '../../../../../styles';
import {useOnboardingTheme} from '../../../../../theme/onboarding';

const SignedInVerusIdOverview = ({controller}) => {
  const theme = useOnboardingTheme();
  const styles = createSignedInStyles(theme);
  const {linkedIds} = controller.props;
  const chainIds = Object.keys(linkedIds).sort();

  return (
    <View>
      <Portal>
        {controller.state.verusIdDetailsModalProps != null && (
          <VerusIdDetailsModal
            {...controller.state.verusIdDetailsModalProps}
            StickyFooterComponent={
              <View style={{paddingHorizontal: theme.spacing.md}}>
                <Button
                  mode="outlined"
                  textColor={theme.colors.danger}
                  onPress={() =>
                    controller.tryUnlinkIdentity(
                      controller.state.verusIdDetailsModalProps.iAddress,
                      controller.state.verusIdDetailsModalProps.chain,
                    )
                  }>
                  Unlink VerusID
                </Button>
              </View>
            }
          />
        )}
      </Portal>
      {chainIds.map(chainId => {
        const identityAddresses = Object.keys(linkedIds[chainId]).sort((a, b) =>
          linkedIds[chainId][a].localeCompare(linkedIds[chainId][b]),
        );

        return (
          <View key={chainId} style={{marginBottom: theme.spacing.lg}}>
            <Text style={styles.sectionTitle}>{chainId} VerusIDs</Text>
            <View style={styles.surface}>
              {identityAddresses.map((iAddress, index) => (
                <React.Fragment key={iAddress}>
                  <TouchableOpacity
                    accessibilityRole="button"
                    onPress={() =>
                      controller.openVerusIdDetailsModal(chainId, iAddress)
                    }>
                    <List.Item
                      title={linkedIds[chainId][iAddress]}
                      description={iAddress}
                      titleStyle={styles.rowTitle}
                      descriptionStyle={styles.rowDescription}
                      style={styles.row}
                      left={props => (
                        <List.Icon
                          {...props}
                          icon="account-key-outline"
                          color={theme.colors.primary}
                        />
                      )}
                      right={props => (
                        <List.Icon
                          {...props}
                          icon="chevron-right"
                          color={theme.colors.textSubtle}
                        />
                      )}
                    />
                  </TouchableOpacity>
                  {index < identityAddresses.length - 1 && (
                    <View style={styles.divider} />
                  )}
                </React.Fragment>
              ))}
            </View>
            <Button
              mode="text"
              icon="plus"
              onPress={() => controller.openLinkIdentityModalFromChain(chainId)}>
              Link another VerusID
            </Button>
          </View>
        );
      })}
    </View>
  );
};

export default SignedInVerusIdOverview;
