import React, {useEffect, useRef} from 'react';
import {View} from 'react-native';
import {
  registerWalletSetupTarget,
  useWalletSetupLogoHidden,
} from './walletSetupStore';

// Home's asset row logo. The wallet setup screen lands its coins here, so the
// logo stays hidden until its coin arrives.
const WalletSetupLogoSlot = ({coinId, style, children}) => {
  const viewRef = useRef(null);
  const hidden = useWalletSetupLogoHidden(coinId);

  useEffect(
    () => registerWalletSetupTarget(coinId, viewRef.current),
    [coinId],
  );

  return (
    <View
      ref={viewRef}
      collapsable={false}
      style={[style, hidden && {opacity: 0}]}>
      {children}
    </View>
  );
};

export default WalletSetupLogoSlot;
