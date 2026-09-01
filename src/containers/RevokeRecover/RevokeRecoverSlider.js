import React, {useState} from 'react';
import {Text, TouchableOpacity, View} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AppButton from '../../components/AppButton';
import {useOnboardingSmallDeviceLayout} from '../../hooks/useOnboardingSmallDeviceLayout';
import {revokeRecoverFlowStyles as styles} from '../../styles';
import {useAppTheme} from '../../theme/app';
import RevokeRecoverFlowScaffold, {
  RevokeRecoverStepCopy,
} from './RevokeRecoverFlowScaffold';

const ACTIONS = [
  {
    key: 'revoke',
    title: 'Revoke a VerusID',
    body: 'Disable an active identity after its keys may have been lost or compromised.',
    icon: 'shield-off-outline',
  },
  {
    key: 'recover',
    title: 'Recover a VerusID',
    body: 'Restore a revoked identity and assign a new primary address.',
    icon: 'shield-refresh-outline',
  },
];

const RevokeRecoverSlider = ({navigation, setImportedSeed, setIsRecovery}) => {
  const theme = useAppTheme();
  const {smallDevice} = useOnboardingSmallDeviceLayout();
  const [selection, setSelection] = useState(null);
  const selectedAction = ACTIONS.find(action => action.key === selection);

  const continueFlow = () => {
    if (!selectedAction) return;

    setImportedSeed(null);
    setIsRecovery(selectedAction.key === 'recover');
    navigation.navigate('ImportWallet');
  };

  return (
    <RevokeRecoverFlowScaffold
      actions={
        <AppButton
          disabled={!selectedAction}
          onPress={continueFlow}
          testID="revokeRecover.action.continue">
          {selectedAction
            ? `Continue to ${selectedAction.key}`
            : 'Choose an action'}
        </AppButton>
      }
      headerTitle="VerusID safety"
      onBack={() => navigation.goBack()}
      contentContainerStyle={
        smallDevice ? styles.scrollContentCompact : undefined
      }
      progress={0.15}>
      <RevokeRecoverStepCopy
        body="Choose the safeguard you need. Nothing is submitted until you review and confirm the on-chain change."
        compact={smallDevice}
        title="Protect or restore a VerusID"
      />

      <View accessibilityRole="radiogroup" style={styles.choiceGroup}>
        {ACTIONS.map(action => {
          const selected = selection === action.key;

          return (
            <TouchableOpacity
              accessibilityRole="radio"
              accessibilityState={{checked: selected}}
              activeOpacity={0.76}
              key={action.key}
              onPress={() => setSelection(action.key)}
              style={[
                styles.choiceRow,
                smallDevice && styles.choiceRowCompact,
                {
                  backgroundColor: selected
                    ? theme.colors.surfaceMuted
                    : theme.colors.background,
                  borderColor: selected
                    ? theme.colors.primary
                    : theme.colors.border,
                },
              ]}
              testID={`revokeRecover.action.${action.key}`}>
              <View
                style={[
                  styles.choiceIcon,
                  smallDevice && styles.choiceIconCompact,
                  {
                    backgroundColor: selected
                      ? theme.colors.primary
                      : theme.colors.surfaceMuted,
                  },
                ]}>
                <MaterialCommunityIcons
                  color={
                    selected
                      ? theme.colors.onPrimary
                      : theme.colors.textSecondary
                  }
                  name={action.icon}
                  size={23}
                />
              </View>
              <View style={styles.choiceCopy}>
                <Text
                  style={[
                    styles.choiceTitle,
                    {color: theme.colors.textPrimary},
                  ]}>
                  {action.title}
                </Text>
                <Text
                  style={[
                    styles.choiceBody,
                    {color: theme.colors.textSecondary},
                  ]}>
                  {action.body}
                </Text>
              </View>
              <MaterialCommunityIcons
                color={
                  selected ? theme.colors.primary : theme.colors.textSubtle
                }
                name={selected ? 'check-circle' : 'circle-outline'}
                size={23}
              />
            </TouchableOpacity>
          );
        })}
      </View>

      <View
        style={[
          styles.notice,
          smallDevice && styles.noticeCompact,
          {backgroundColor: theme.colors.warningBackground},
        ]}>
        <MaterialCommunityIcons
          color={theme.colors.warning}
          name="key-outline"
          size={21}
        />
        <Text style={[styles.noticeCopy, {color: theme.colors.textSecondary}]}>
          You will need the revocation or recovery authority’s secret or private
          key. It stays on this device and only signs this action.
        </Text>
      </View>
    </RevokeRecoverFlowScaffold>
  );
};

export default RevokeRecoverSlider;
