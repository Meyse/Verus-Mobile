import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import AppButton from '../../components/AppButton';
import CopyAction from '../../components/CopyAction';
import {revokeRecoverFlowStyles as styles} from '../../styles';
import {useAppTheme} from '../../theme/app';
import RevokeRecoverFlowScaffold from './RevokeRecoverFlowScaffold';
import RecoveryValues, {IdentityContext, RecoveryValue} from './RecoveryValues';

const RevokeRecoverSubmittedResult = ({
  action,
  identityName,
  networkName,
  onDone,
  onViewTransaction,
  txid,
  values,
}) => {
  const theme = useAppTheme();
  const recovery = action === 'recovery';
  return (
    <RevokeRecoverFlowScaffold
      actions={
        <AppButton onPress={onDone} testID="revokeRecover.result.done">
          Done
        </AppButton>
      }
      backDisabled
      showBack={false}
      showProgress={false}
      headerTitle={recovery ? 'Recovery submitted' : 'Revocation submitted'}
      keyboardAvoiding={false}>
      <Text
        style={[
          theme.typography.bodyMd,
          localStyles.body,
          {color: theme.colors.textSecondary},
        ]}>
        {recovery
          ? 'Your VerusID becomes active after one network confirmation.'
          : 'Your VerusID becomes revoked after one network confirmation.'}
      </Text>
      <IdentityContext name={identityName} networkName={networkName} />
      {recovery ? (
        <RecoveryValues values={values} title="Submitted values" />
      ) : (
        <RecoveryValue label="Requested status" value="Active → Revoked" />
      )}
      <View style={localStyles.transaction}>
        <Text
          style={[
            theme.typography.labelMd,
            {color: theme.colors.textSecondary},
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
          <CopyAction accessibilityLabel="Copy transaction ID" value={txid} />
        </View>
        {onViewTransaction ? (
          <TouchableOpacity
            accessibilityRole="link"
            onPress={onViewTransaction}
            style={localStyles.link}>
            <Text
              style={[
                theme.typography.labelMd,
                {
                  color: theme.isDark
                    ? theme.colors.textPrimary
                    : theme.colors.primary,
                },
              ]}>
              View transaction
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </RevokeRecoverFlowScaffold>
  );
};
const localStyles = StyleSheet.create({
  body: {marginTop: 8, marginBottom: 18},
  transaction: {marginTop: 18},
  link: {minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start'},
});
export default RevokeRecoverSubmittedResult;
