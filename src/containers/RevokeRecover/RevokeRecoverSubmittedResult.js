import React from 'react';
import {Text, View} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AppButton from '../../components/AppButton';
import CopyAction from '../../components/CopyAction';
import {revokeRecoverFlowStyles as styles} from '../../styles';
import {useAppTheme} from '../../theme/app';
import RevokeRecoverFlowScaffold from './RevokeRecoverFlowScaffold';

const RevokeRecoverSubmittedResult = ({
  action,
  identityName,
  networkName,
  onDone,
  onViewTransaction,
  txid,
}) => {
  const theme = useAppTheme();
  const recovery = action === 'recovery';

  return (
    <RevokeRecoverFlowScaffold
      actions={
        <>
          {onViewTransaction ? (
            <AppButton onPress={onViewTransaction} variant="secondary">
              View transaction
            </AppButton>
          ) : null}
          <AppButton onPress={onDone} testID="revokeRecover.result.done">
            Done
          </AppButton>
        </>
      }
      backDisabled
      contentContainerStyle={styles.centeredScrollContent}
      headerTitle={recovery ? 'Recover VerusID' : 'Revoke VerusID'}
      keyboardAvoiding={false}
      onBack={onDone}
      progress={1}>
      <View style={styles.result}>
        <View
          style={[
            styles.resultIcon,
            {backgroundColor: theme.colors.warningBackground},
          ]}>
          <MaterialCommunityIcons
            color={theme.colors.warning}
            name="progress-check"
            size={56}
          />
        </View>
        <Text
          accessibilityRole="header"
          style={[
            theme.typography.headlineMd,
            styles.resultTitle,
            {color: theme.colors.textPrimary},
          ]}>
          {recovery ? 'Recovery submitted' : 'Revocation submitted'}
        </Text>
        <Text
          style={[
            theme.typography.bodyMd,
            styles.resultBody,
            {color: theme.colors.textSecondary},
          ]}>
          The transaction was broadcast to {networkName}. The VerusID status
          changes after the network confirms it.
        </Text>

        <View
          style={[
            styles.resultDetails,
            {
              backgroundColor: theme.colors.surfaceMuted,
              borderColor: theme.colors.border,
            },
          ]}>
          <Text
            style={[styles.resultLabel, {color: theme.colors.textSecondary}]}>
            VerusID
          </Text>
          <Text
            selectable
            style={[styles.networkName, {color: theme.colors.textPrimary}]}>
            {identityName}
          </Text>
          <Text
            style={[
              styles.resultLabel,
              {color: theme.colors.textSecondary, marginTop: 18},
            ]}>
            Transaction ID
          </Text>
          <View style={styles.txidRow}>
            <Text
              numberOfLines={1}
              selectable
              style={[styles.txid, {color: theme.colors.textPrimary}]}>
              {txid}
            </Text>
            <CopyAction
              accessibilityLabel="Copy transaction ID"
              color={theme.colors.primary}
              value={txid}
            />
          </View>
        </View>
      </View>
    </RevokeRecoverFlowScaffold>
  );
};

export default RevokeRecoverSubmittedResult;
