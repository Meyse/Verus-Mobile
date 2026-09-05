import React, {useState} from 'react';
import {Text, TouchableOpacity, View} from 'react-native';
import {Check, ChevronRight} from 'lucide-react-native';
import {revokeRecoverFlowStyles as styles} from '../../styles';
import {useAppTheme} from '../../theme/app';
import RevokeRecoverFlowScaffold from './RevokeRecoverFlowScaffold';
import RevokeRecoverAuthoritySheet from './RevokeRecoverAuthoritySheet';

const ACTIONS = [
  {
    key: 'revoke',
    title: 'Revoke a VerusID',
    body: 'Disable an active identity',
  },
  {
    key: 'recover',
    title: 'Recover a VerusID',
    body: 'Restore a revoked identity',
  },
];

const RevokeRecoverSlider = ({
  navigation,
  onSelectImportMethod,
  setImportedSeed,
  setIsRecovery,
}) => {
  const theme = useAppTheme();
  const [selection, setSelection] = useState(null);
  const [authoritySheetVisible, setAuthoritySheetVisible] = useState(false);
  const chooseAction = key => {
    setSelection(key);
    setImportedSeed(null);
    setIsRecovery(key === 'recover');
    setAuthoritySheetVisible(true);
  };

  return (
    <RevokeRecoverFlowScaffold
      headerTitle="Choose action"
      onBack={() => navigation.goBack()}
      progress={0.15}
      overlayVisible={authoritySheetVisible}
      overlay={
        <RevokeRecoverAuthoritySheet
          isRecovery={selection === 'recover'}
          onClose={() => setAuthoritySheetVisible(false)}
          onSelectMethod={onSelectImportMethod}
          visible={authoritySheetVisible}
        />
      }>
      <View style={styles.choiceGroup}>
        {ACTIONS.map(action => {
          const selected = selection === action.key;
          const Icon = selected ? Check : ChevronRight;
          return (
            <TouchableOpacity
              key={action.key}
              accessibilityRole="button"
              accessibilityState={{selected}}
              onPress={() => chooseAction(action.key)}
              style={[
                styles.choiceRow,
                {
                  backgroundColor: selected
                    ? theme.colors.surfaceMuted
                    : theme.colors.background,
                },
              ]}
              testID={`revokeRecover.action.${action.key}`}>
              <View style={styles.choiceCopy}>
                <Text
                  style={[
                    theme.typography.bodyMd,
                    {color: theme.colors.textPrimary},
                  ]}>
                  {action.title}
                </Text>
                <Text
                  style={[
                    theme.typography.caption,
                    {color: theme.colors.textSecondary},
                  ]}>
                  {action.body}
                </Text>
              </View>
              <Icon
                size={22}
                color={
                  selected ? theme.colors.primary : theme.colors.textSubtle
                }
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </RevokeRecoverFlowScaffold>
  );
};

export default RevokeRecoverSlider;
