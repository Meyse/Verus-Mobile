import React from 'react';
import InfoSheet from '../../../components/InfoSheet';
import {InfoSheetRow} from '../../../components/InfoSheetSection';

// The facts a review shows only on request: where, by which route, from which
// Card, and what is left. Rows with no value are skipped.
const TransferDetailsSheet = ({onClose, rows, visible}) => (
  <InfoSheet title="Transaction details" visible={visible} onClose={onClose}>
    {rows.map(row => (
      <InfoSheetRow key={row.label} label={row.label} value={row.value} />
    ))}
  </InfoSheet>
);

export default TransferDetailsSheet;
