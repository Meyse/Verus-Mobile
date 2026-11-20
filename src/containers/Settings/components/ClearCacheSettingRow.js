import React, {useCallback} from 'react';
import {useDispatch} from 'react-redux';
import {clearCacheData} from '../../../actions/actionCreators';
import {
  createAlert,
  resolveAlert,
} from '../../../actions/actions/alert/dispatchers/alert';
import {SettingsRow} from './SettingsScaffold';
import {resetToSecureLoading} from './settingsTaskNavigation';

// F12 (PR 266): the cache only. It never deletes the private wallet's synced
// data and starts no resync; ClearBlockchainDataSettingRow does that.
const ClearCacheSettingRow = ({last = false, navigation}) => {
  const dispatch = useDispatch();

  const canClearCache = useCallback(
    () =>
      createAlert(
        'Clear the cache?',
        'Saved server responses and currency lists are deleted. The wallet loads them again when it needs them.',
        [
          {
            text: 'Not now',
            onPress: () => resolveAlert(false),
            style: 'cancel',
          },
          {text: 'Clear cache', onPress: () => resolveAlert(true)},
        ],
      ),
    [],
  );

  const clearCache = useCallback(() => {
    canClearCache().then(confirmed => {
      if (confirmed) {
        resetToSecureLoading(navigation, {
          task: () => clearCacheData(dispatch),
          message: 'Clearing cache',
          route: 'Home',
          successMsg: 'Cache cleared',
          errorMsg: 'The cache was not cleared.',
        });
      }
    });
  }, [canClearCache, dispatch, navigation]);

  return (
    <SettingsRow
      description="Saved server data, no resync"
      icon="database-refresh"
      last={last}
      onPress={clearCache}
      showChevron={false}
      title="Clear cache"
    />
  );
};

export default ClearCacheSettingRow;
