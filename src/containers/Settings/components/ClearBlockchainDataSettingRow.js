import React, {useCallback} from 'react';
import {useSelector} from 'react-redux';
import {
  clearBlockchainData,
  getResyncablePrivateCoins,
} from '../../../actions/actions/cache/Cache';
import {
  createAlert,
  resolveAlert,
} from '../../../actions/actions/alert/dispatchers/alert';
import {SettingsRow} from './SettingsScaffold';
import {resetToSecureLoading} from './settingsTaskNavigation';

// F12 (PR 266): rewinds the private wallet to its birthday, separate from
// "Clear cache". The Private card then syncs again from there. It shows only
// while a private wallet is open.
const ClearBlockchainDataSettingRow = ({last = false, navigation}) => {
  const hasPrivateWallet = useSelector(
    state => getResyncablePrivateCoins(state).length > 0,
  );

  const confirm = useCallback(
    () =>
      createAlert(
        'Clear blockchain data?',
        'The Private card deletes its synced data and resyncs from the start. This can take a long time.',
        [
          {
            text: 'Not now',
            onPress: () => resolveAlert(false),
            style: 'cancel',
          },
          {text: 'Clear data', onPress: () => resolveAlert(true)},
        ],
      ),
    [],
  );

  const clear = useCallback(() => {
    confirm().then(confirmed => {
      if (confirmed) {
        resetToSecureLoading(navigation, {
          task: clearBlockchainData,
          message: 'Clearing blockchain data',
          route: 'Home',
          successMsg: 'Blockchain data cleared',
          errorMsg: 'The blockchain data was not cleared.',
        });
      }
    });
  }, [confirm, navigation]);

  if (!hasPrivateWallet) return null;

  return (
    <SettingsRow
      description="Private card resyncs"
      icon="database-remove"
      last={last}
      onPress={clear}
      showChevron={false}
      title="Clear blockchain data"
    />
  );
};

export default ClearBlockchainDataSettingRow;
