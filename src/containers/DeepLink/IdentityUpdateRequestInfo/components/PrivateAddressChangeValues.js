import React, {useMemo} from 'react';
import {InfoSheetRow} from '../../../../components/InfoSheetSection';
import {requestCardStyles} from '../../../../styles';
import {useOnboardingTheme} from '../../../../theme/onboarding';

// All three review surfaces show the same raw addresses and empty-state copy.
// InfoSheetRow supplies CopyAction only when an address exists.
const PrivateAddressChangeValues = ({change}) => {
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
          valueStyle={address ? styles.identifier : undefined}
        />
      ))}
    </>
  );
};

export default PrivateAddressChangeValues;
