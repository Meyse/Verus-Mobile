import React from 'react';
import SelectionSheet, {SelectionRow} from '../../../components/SelectionSheet';
import useSheetDismissal from '../../../components/useSheetDismissal';
import {ADDRESS_TYPE} from '../wizardUtils';

const SelfAddressSheet = ({
  addressType,
  addresses,
  onClose,
  onSelect,
  visible,
}) => {
  const dismissal = useSheetDismissal({visible, onClose});
  return (
    <SelectionSheet
      title="Your addresses"
      subtitle={`${
        addressType === ADDRESS_TYPE.ETHEREUM ? 'Ethereum' : 'Verus'
      } addresses in this wallet`}
      visible={visible}
      onClose={dismissal.close}
      onClosed={dismissal.onClosed}>
      {addresses.map(item => (
        <SelectionRow
          key={item.id || item.address}
          title={item.verusIdName || item.address}
          titleMonospace={!item.verusIdName}
          subtitle={item.verusIdName ? item.address : undefined}
          subtitleMonospace
          onPress={() => dismissal.dismiss(() => onSelect(item))}
        />
      ))}
    </SelectionSheet>
  );
};

export default SelfAddressSheet;
