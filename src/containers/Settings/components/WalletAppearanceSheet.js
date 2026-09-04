import React, {useEffect, useState} from 'react';
import {useDispatch} from 'react-redux';
import {setWalletAvatar} from '../../../actions/actionCreators';
import WalletAvatarPickerSheet from '../../Onboard/CreateProfile/Forms/WalletAvatarPickerSheet';
import {createAlert} from '../../../actions/actions/alert/dispatchers/alert';
import {
  DEFAULT_WALLET_AVATAR,
  normalizeWalletAvatar,
} from '../../../utils/walletAvatar';

const WalletAppearanceSheet = ({account, onClose, visible}) => {
  const dispatch = useDispatch();
  const [draftAvatar, setDraftAvatar] = useState(DEFAULT_WALLET_AVATAR);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setDraftAvatar(
        normalizeWalletAvatar(account?.walletAvatar, DEFAULT_WALLET_AVATAR),
      );
    }
  }, [account?.walletAvatar, visible]);

  const saveAppearance = async () => {
    if (!account?.accountHash || saving) return;

    setSaving(true);

    try {
      dispatch(await setWalletAvatar(account.accountHash, draftAvatar));
      onClose();
    } catch (error) {
      createAlert(
        'Unable to change wallet appearance',
        error.message || 'Please try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <WalletAvatarPickerSheet
      onChange={setDraftAvatar}
      onClose={onClose}
      onSubmit={saveAppearance}
      submitLabel="Save"
      submitVariant="primary"
      submitting={saving}
      visible={visible}
      walletAvatar={draftAvatar}
    />
  );
};

export default WalletAppearanceSheet;
