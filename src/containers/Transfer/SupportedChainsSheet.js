import React from 'react';
import InfoSheet from '../../components/InfoSheet';
import {InfoSheetRow} from '../../components/InfoSheetSection';

const SupportedChainsSheet = ({networks, onClose, visible}) => (
  <InfoSheet
    title="Supported chains"
    subtitle="This address supports all currencies on all chains in the Verus ecosystem."
    visible={visible}
    onClose={onClose}>
    {networks.map(network => (
      <InfoSheetRow
        key={network.id}
        label={network.display_name}
        value={network.display_ticker}
      />
    ))}
  </InfoSheet>
);

export default SupportedChainsSheet;
