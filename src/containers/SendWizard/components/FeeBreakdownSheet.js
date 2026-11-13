import React from 'react';
import InfoSheet from '../../../components/InfoSheet';
import {InfoSheetRow, InfoSheetTopic} from '../../../components/InfoSheetSection';

const FeeBreakdownSheet = ({feeItems, onClose, visible}) => (
  <InfoSheet
    title="Fee breakdown"
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

// The Network fee of an Ethereum-to-Verus bridge transfer. The fee is the gas
// limit at the highest gas price the transfer accepts. Ethereum charges only
// the gas used, so the real fee is lower. A transfer of the whole balance also
// keeps some ETH back (owner, 2026-11-13: keep upstream's amounts, explain them).
export const BridgeNetworkFeeSheet = ({fee, lowered, money, onClose, ticker = 'ETH', visible}) => (
  <InfoSheet
    title="Network fee"
    visible={visible}
    onClose={onClose}>
    <InfoSheetRow label="Most it can cost" value={money ? `${money}  ${fee}` : fee} />
    <InfoSheetTopic title="You pay for the gas used">
      The Ethereum network charges only for the gas the transfer uses. The wallet sets a higher limit so that the transfer goes through. What the transfer does not use stays in your wallet.
    </InfoSheetTopic>
    {lowered ? (
      <InfoSheetTopic title="Why the amount is lower">
        {`The wallet took the fees from your amount and keeps some extra ${ticker} back to make sure the transfer goes through. That ${ticker} stays in your wallet.`}
      </InfoSheetTopic>
    ) : null}
  </InfoSheet>
);

export default FeeBreakdownSheet;
