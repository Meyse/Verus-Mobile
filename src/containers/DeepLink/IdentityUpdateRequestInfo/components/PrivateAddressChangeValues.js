import React, {useMemo} from 'react';
import {InfoSheetRow} from '../../../../components/InfoSheetSection';
import {requestCardStyles} from '../../../../styles';
import {useOnboardingTheme} from '../../../../theme/onboarding';

// All three review surfaces show the same raw addresses and empty-state copy.
// InfoSheetRow supplies CopyAction only when an address exists. The compact
// form keeps each address on one line, so both values stay above a fixed
// confirm button on small phones; the copy action still copies the full value.
const PrivateAddressChangeValues = ({change, compact = false}) => {
  const theme = useOnboardingTheme();
  const styles = useMemo(() => requestCardStyles(theme), [theme]);

  return (
    <>
      {[
        ['Current', change.beforeAddress],
        ['After update', change.afterAddress],
      ].map(([label, address]) => (
        <InfoSheetRow
          key={label}
          label={label}
          value={address || 'No private address'}
          copy={!!address}
          ellipsizeMode={compact && address ? 'middle' : undefined}
          numberOfLines={compact && address ? 1 : undefined}
          valueStyle={address ? styles.identifier : undefined}
        />
      ))}
    </>
  );
};

export default PrivateAddressChangeValues;
