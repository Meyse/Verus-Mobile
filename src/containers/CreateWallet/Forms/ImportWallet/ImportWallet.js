import React, {useCallback, useEffect, useState} from 'react';
import {View} from 'react-native';
import ImportIntro from './Forms/ImportIntro';
import ImportNfc from './Forms/ImportNfc';
import ImportSeed from './Forms/ImportSeed';
import ImportText from './Forms/ImportText';
import ShieldedAddressSetup from '../CreateSeed/Forms/ShieldedAddressSetup';
import ScanSeed from '../../../../components/ScanSeed';
import CompactSetupHeader from '../../../Onboard/components/CompactSetupHeader';
import {signedOutFlowStyles as styles} from '../../../../styles';
import {shouldOfferImportShieldedRestore} from '../../../Onboard/onboardingSetupFlow';

const IMPORT_STEPS = {
  INTRO: 'intro',
  SEED: 'seed',
  TEXT: 'text',
  NFC: 'nfc',
  SHIELDED_ADDRESS: 'shieldedAddress',
};

const IMPORT_SEED_PROGRESS_CAP = 0.95;

export default function ImportWalletStackScreens({
  navigation,
  importedSeed,
  setImportedSeed,
  onComplete,
  label,
}) {
  const [step, setStep] = useState(IMPORT_STEPS.INTRO);
  const [seedEntryProgress, setSeedEntryProgress] = useState(0);
  const [scannerVisible, setScannerVisible] = useState(false);

  useEffect(() => {
    if (
      step !== IMPORT_STEPS.SEED &&
      step !== IMPORT_STEPS.SHIELDED_ADDRESS
    ) {
      setSeedEntryProgress(0);
    }
  }, [step]);

  const completeImportedSeed = seedOverride => {
    const seed = seedOverride != null ? seedOverride : importedSeed;

    setImportedSeed(seed);

    if (shouldOfferImportShieldedRestore(seed)) {
      setStep(IMPORT_STEPS.SHIELDED_ADDRESS);
      return;
    }

    onComplete(seed, {useSeedAsZ: false});
  };

  const selectMethod = nextStep => {
    setScannerVisible(nextStep === 'qr');

    if (nextStep === 'qr') {
      setStep(IMPORT_STEPS.TEXT);
    } else {
      setStep(nextStep);
    }
  };

  const goBack = () => {
    if (scannerVisible) {
      setScannerVisible(false);
    } else if (step === IMPORT_STEPS.INTRO) {
      navigation?.goBack?.();
    } else if (step === IMPORT_STEPS.SHIELDED_ADDRESS) {
      setStep(IMPORT_STEPS.SEED);
    } else {
      setStep(IMPORT_STEPS.INTRO);
      setScannerVisible(false);
    }
  };

  const handleScan = useCallback(
    seed => {
      setScannerVisible(false);
      setImportedSeed(seed);
    },
    [setImportedSeed],
  );

  const closeScanner = useCallback(() => {
    setScannerVisible(false);
  }, []);

  const getProgress = () => {
    if (step === IMPORT_STEPS.INTRO) return 0.5;
    if (step === IMPORT_STEPS.SEED) {
      return 0.5 + seedEntryProgress * (IMPORT_SEED_PROGRESS_CAP - 0.5);
    }

    return 1;
  };

  const content = (() => {
    if (step === IMPORT_STEPS.SEED) {
      return (
        <ImportSeed
          importedSeed={importedSeed}
          setImportedSeed={setImportedSeed}
          onComplete={completeImportedSeed}
          onImportProgressChange={setSeedEntryProgress}
        />
      );
    }

    if (step === IMPORT_STEPS.SHIELDED_ADDRESS) {
      return (
        <ShieldedAddressSetup
          actionLabel="Complete"
          body="Use this Secret Recovery Phrase for private transactions and encryption capabilities. Recommended."
          onBack={goBack}
          onComplete={useSeedAsZ => onComplete(importedSeed, {useSeedAsZ})}
          optionLabel="Restore shielded address"
          progress={getProgress()}
          showHeader={false}
          title="Restore shielded address"
        />
      );
    }

    if (step === IMPORT_STEPS.TEXT) {
      return (
        <ImportText
          importedSeed={importedSeed}
          setImportedSeed={setImportedSeed}
          onComplete={completeImportedSeed}
        />
      );
    }

    if (step === IMPORT_STEPS.NFC) {
      return (
        <ImportNfc setImportedSeed={setImportedSeed} onComplete={onComplete} />
      );
    }

    return <ImportIntro label={label} onSelectMethod={selectMethod} />;
  })();

  if (scannerVisible) {
    return <ScanSeed cancel={closeScanner} onScan={handleScan} />;
  }

  return (
    <View style={styles.container}>
      <CompactSetupHeader onBack={goBack} progress={getProgress()} />
      {content}
    </View>
  );
}
