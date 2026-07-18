import React, {useCallback} from 'react';
import AlertAsync from 'react-native-alert-async';
import {useDispatch} from 'react-redux';
import {clearCacheData} from '../../../actions/actionCreators';
import {SettingsRow} from './SettingsScaffold';
import {resetToSecureLoading} from './settingsTaskNavigation';

const ClearCacheSettingRow = ({last = false, navigation}) => {
  const dispatch = useDispatch();

  const canClearCache = useCallback(
    () =>
      AlertAsync(
        'Confirm',
        'Are you sure you would like to clear the stored data cache? ' +
          '(This could impact performance temporarily but will not delete any account information)',
        [
          {
            text: 'No, take me back',
            onPress: () => Promise.resolve(false),
            style: 'cancel',
          },
          {text: 'Yes', onPress: () => Promise.resolve(true)},
        ],
        {cancelable: false},
      ),
    [],
  );

  const clearCache = useCallback(() => {
    canClearCache().then(confirmed => {
      if (confirmed) {
        resetToSecureLoading(navigation, {
          task: () => clearCacheData(dispatch),
          message: 'Clearing cache, please do not close Verus Mobile',
          route: 'Home',
          successMsg: 'Cache cleared successfully',
          errorMsg: 'Cache failed to clear',
        });
      }
    });
  }, [canClearCache, dispatch, navigation]);

  return (
    <SettingsRow
      description="Wallet data will resync"
      icon="database-refresh"
      last={last}
      onPress={clearCache}
      showChevron={false}
      title="Clear cache"
    />
  );
};

export default ClearCacheSettingRow;
