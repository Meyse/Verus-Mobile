import React from 'react';
import InfoSheet from '../../../components/InfoSheet';
import {InfoSheetRow} from '../../../components/InfoSheetSection';

const FeeBreakdownSheet = ({feeItems, onClose, visible}) => (
  <InfoSheet
    title="Fee breakdown"
    subtitle="Fees are calculated by the selected Verus Card and route during preflight."
    visible={visible}
    onClose={onClose}>
    {(feeItems.length
      ? feeItems
      : [{amount: 'Calculated by wallet', currency: ''}]
    ).map((item, index) => (
      <InfoSheetRow
        key={`${item.amount}:${item.currency}:${index}`}
        label="Network fee"
        value={`${item.amount}${item.currency ? ` ${item.currency}` : ''}`}
      />
    ))}
  </InfoSheet>
);

export default FeeBreakdownSheet;
