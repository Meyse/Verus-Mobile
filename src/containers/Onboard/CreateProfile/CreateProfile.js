import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {StatusBar, View} from 'react-native';
import {createAlert} from '../../../actions/actions/alert/dispatchers/alert';
import ChooseName from './Forms/ChooseName';
import CreatePassword from './Forms/CreatePassword';
import UseBiometrics from './Forms/UseBiometrics';
import {useDispatch} from 'react-redux';
import {
  closeLoadingModal,
  openLoadingModal,
} from '../../../actions/actionDispatchers';
import {setDeeplinkUrl} from '../../../actions/actionCreators';
import {useObjectSelector} from '../../../hooks/useObjectSelector';
import {createProfileFromSeed} from '../../../utils/profile/createProfileFromSeed';
import {getKey} from '../../../utils/keyGenerator/keyGenerator';
import {getSupportedBiometryType} from '../../../utils/keychain/keychain';
import ScanSeed from '../../../components/ScanSeed';
import SeedIntro from '../../CreateWallet/Forms/CreateSeed/Forms/SeedIntro';
import ShieldedAddressSetup from '../../CreateWallet/Forms/CreateSeed/Forms/ShieldedAddressSetup';
import SeedWords, {
  WORDS_PER_STEP,
} from '../../CreateWallet/Forms/CreateSeed/Forms/SeedWords';
import ImportNfc from '../../CreateWallet/Forms/ImportWallet/Forms/ImportNfc';
import ImportSeed from '../../CreateWallet/Forms/ImportWallet/Forms/ImportSeed';
import ImportText from '../../CreateWallet/Forms/ImportWallet/Forms/ImportText';
import CompactSetupHeader from '../components/CompactSetupHeader';
import {DEFAULT_WALLET_AVATAR} from '../../../utils/walletAvatar';
import {createSignedOutFlowStyles} from '../../../styles';
import {useOnboardingTheme} from '../../../theme/onboarding';
import {
  IMPORT_METHODS,
  SETUP_PATHS,
  normalizeSetupSelection,
  shouldOfferImportShieldedRestore,
} from '../onboardingSetupFlow';
import {getPendingDeeplinkReplay} from '../../../utils/deeplink/pendingDeeplinkStorage';

const DEFAULT_SEED_WORD_COUNT = 24;
const IMPORT_SEED_PROGRESS_WEIGHT = 0.75;

const SETUP_STEPS = {
  NAME: 'name',
  PASSWORD: 'password',
  BIOMETRICS: 'biometrics',
  SEED_INTRO: 'seedIntro',
  SEED_WORDS: 'seedWords',
  SHIELDED_ADDRESS: 'shieldedAddress',
  IMPORT_SEED: 'importSeed',
  IMPORT_TEXT: 'importText',
  IMPORT_NFC: 'importNfc',
  IMPORT_SHIELDED_ADDRESS: 'importShieldedAddress',
};

const getImportStepForImportMethod = importMethod => {
  if (importMethod === IMPORT_METHODS.SEED) {
    return SETUP_STEPS.IMPORT_SEED;
  }

  if (importMethod === IMPORT_METHODS.NFC) {
    return SETUP_STEPS.IMPORT_NFC;
  }

  return SETUP_STEPS.IMPORT_TEXT;
};

const shouldCollectImportBeforeProfile = setupSelection =>
  setupSelection.setupPath === SETUP_PATHS.IMPORT &&
  (setupSelection.importMethod === IMPORT_METHODS.QR ||
    setupSelection.importMethod === IMPORT_METHODS.NFC);

export default function CreateProfileStackScreens(props) {
  const theme = useOnboardingTheme();
  const styles = useMemo(() => createSignedOutFlowStyles(theme), [theme]);
  const setupSelection = useMemo(
    () => normalizeSetupSelection(props.route?.params),
    [props.route?.params],
  );
  const testProfile = props.testProfile === true;
  const isImportSetup = setupSelection.setupPath === SETUP_PATHS.IMPORT;
  const collectImportBeforeProfile =
    shouldCollectImportBeforeProfile(setupSelection);
  const initialStep = collectImportBeforeProfile
    ? getImportStepForImportMethod(setupSelection.importMethod)
    : SETUP_STEPS.NAME;
  const [profileName, setProfileName] = useState('');
  const [walletAvatar, setWalletAvatar] = useState(DEFAULT_WALLET_AVATAR);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [useBiometrics, setUseBiometrics] = useState(false);
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [newSeed, setNewSeed] = useState(null);
  const [importedSeed, setImportedSeed] = useState('');
  const [importedSeedReady, setImportedSeedReady] = useState(false);
  const [importSeedEntryProgress, setImportSeedEntryProgress] = useState(0);
  const [scannerVisible, setScannerVisible] = useState(
    collectImportBeforeProfile &&
      setupSelection.importMethod === IMPORT_METHODS.QR,
  );
  const [seedWordStep, setSeedWordStep] = useState(0);
  const [biometryAvailable, setBiometryAvailable] = useState(null);
  const [supportedBiometryType, setSupportedBiometryType] = useState(null);
  const dispatch = useDispatch();

  const accounts = useObjectSelector(state => state.authentication.accounts);
  const activeCoinList = useObjectSelector(state => state.coins.activeCoinList);

  const resolveBiometryAvailability = useCallback(async () => {
    if (biometryAvailable != null) return biometryAvailable;

    try {
      const biometryType = await getSupportedBiometryType();
      const supported = !!biometryType.biometry;

      setSupportedBiometryType(biometryType);
      setBiometryAvailable(supported);
      return supported;
    } catch (e) {
      setSupportedBiometryType(null);
      setBiometryAvailable(false);
      return false;
    }
  }, [biometryAvailable]);

  useEffect(() => {
    let active = true;

    getSupportedBiometryType()
      .then(result => {
        if (active) {
          setSupportedBiometryType(result);
          setBiometryAvailable(!!result.biometry);
        }
      })
      .catch(() => {
        if (active) {
          setSupportedBiometryType(null);
          setBiometryAvailable(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const ensureNewSeed = useCallback(async () => {
    if (newSeed) return newSeed;

    try {
      const seed = await getKey(256);

      setNewSeed(seed);
      return seed;
    } catch (e) {
      createAlert('Error', 'Error generating Secret Recovery Phrase.');
      console.warn(e);
      return null;
    }
  }, [newSeed]);

  const createProfile = async (seed, createAsTestProfile, useSeedAsZ) => {
    openLoadingModal('Setting up your new profile...');
    let profileCreated = false;

    try {
      await createProfileFromSeed({
        profileName,
        password,
        seed,
        accounts,
        activeCoinList,
        dispatch,
        testProfile: createAsTestProfile,
        includeDlightSeed: useSeedAsZ,
        useBiometrics,
        walletAvatar,
      });
      profileCreated = true;
      const resumePendingDeeplinkId =
        props.route?.params?.resumePendingDeeplinkId;

      if (resumePendingDeeplinkId) {
        const replay = await getPendingDeeplinkReplay(
          resumePendingDeeplinkId,
        );

        if (!replay) {
          throw new Error(
            'Your wallet is ready, but the saved claim could not be reopened. Open it from Pending Requests.',
          );
        }

        dispatch(setDeeplinkUrl(replay.url, replay.passthrough));
      } else {
        createAlert(
          'Profile created!',
          `Your '${profileName}' profile has been created and is ready to use.`,
        );
      }
    } catch (e) {
      console.error(e);
      createAlert(profileCreated ? 'Wallet ready' : 'Error', e.message);
    }

    closeLoadingModal();
  };

  const getImportStepForMethod = () =>
    getImportStepForImportMethod(setupSelection.importMethod);

  const finalizeImportedSeed = seedOverride => {
    const seed = seedOverride != null ? seedOverride : importedSeed;

    setImportedSeed(seed);

    if (shouldOfferImportShieldedRestore(seed)) {
      setCurrentStep(SETUP_STEPS.IMPORT_SHIELDED_ADDRESS);
    } else {
      return createProfile(seed, testProfile, false);
    }
  };

  const completeImportedSeed = seedOverride => {
    const seed = seedOverride != null ? seedOverride : importedSeed;

    setImportedSeed(seed);

    if (collectImportBeforeProfile) {
      setImportedSeedReady(true);
      setCurrentStep(SETUP_STEPS.NAME);
      return;
    }

    return finalizeImportedSeed(seed);
  };

  const startWalletSetup = () => {
    if (!isImportSetup) {
      setCurrentStep(SETUP_STEPS.SEED_INTRO);
      return;
    }

    if (collectImportBeforeProfile && importedSeedReady) {
      return finalizeImportedSeed();
    }

    setCurrentStep(getImportStepForMethod());

    if (setupSelection.importMethod === IMPORT_METHODS.QR) {
      setScannerVisible(true);
    }
  };

  const completeImportShieldedSetup = useSeedAsZ => {
    return createProfile(importedSeed, testProfile, useSeedAsZ);
  };

  const closeScanner = useCallback(() => {
    setScannerVisible(false);
  }, []);

  const handleScan = seed => {
    setScannerVisible(false);
    setImportedSeed(seed);

    if (collectImportBeforeProfile) {
      completeImportedSeed(seed);
    }
  };

  const seedWordCount = useMemo(() => {
    if (!newSeed) return DEFAULT_SEED_WORD_COUNT;

    return newSeed.split(' ').filter(Boolean).length || DEFAULT_SEED_WORD_COUNT;
  }, [newSeed]);

  const seedWordPageCount = Math.max(
    1,
    Math.ceil(seedWordCount / WORDS_PER_STEP),
  );
  const hasBiometryStep = biometryAvailable !== false;
  const securityStepCount = 2 + (hasBiometryStep ? 1 : 0);
  const walletStepStartIndex = securityStepCount;
  const totalStepCount = isImportSetup
    ? securityStepCount + 2
    : walletStepStartIndex + 1 + seedWordPageCount + 2;
  const currentStepIndex = (() => {
    if (currentStep === SETUP_STEPS.NAME) {
      return collectImportBeforeProfile ? 1 : 0;
    }
    if (currentStep === SETUP_STEPS.PASSWORD) {
      return collectImportBeforeProfile ? 2 : 1;
    }
    if (currentStep === SETUP_STEPS.BIOMETRICS) {
      return collectImportBeforeProfile ? 3 : 2;
    }
    if (currentStep === SETUP_STEPS.SEED_INTRO) return walletStepStartIndex;
    if (currentStep === SETUP_STEPS.SHIELDED_ADDRESS && newSeed) {
      return totalStepCount - 1;
    }
    if (currentStep === SETUP_STEPS.IMPORT_SHIELDED_ADDRESS) {
      return totalStepCount - 1;
    }
    if (currentStep === SETUP_STEPS.IMPORT_SEED) {
      return (
        walletStepStartIndex +
        importSeedEntryProgress * IMPORT_SEED_PROGRESS_WEIGHT
      );
    }
    if (
      currentStep === SETUP_STEPS.IMPORT_TEXT ||
      currentStep === SETUP_STEPS.IMPORT_NFC
    ) {
      return collectImportBeforeProfile ? 0 : walletStepStartIndex;
    }

    return walletStepStartIndex + 1 + Math.min(seedWordStep, seedWordPageCount);
  })();
  const progress = (currentStepIndex + 1) / totalStepCount;

  const continueFromPassword = async () => {
    const supported = await resolveBiometryAvailability();

    if (supported) {
      setCurrentStep(SETUP_STEPS.BIOMETRICS);
    } else {
      startWalletSetup();
    }
  };

  const continueToSeedWords = seed => {
    setNewSeed(seed);
    setSeedWordStep(0);
    setCurrentStep(SETUP_STEPS.SEED_WORDS);
  };

  const backToSecurityStep = () => {
    setCurrentStep(
      biometryAvailable ? SETUP_STEPS.BIOMETRICS : SETUP_STEPS.PASSWORD,
    );
  };

  const backToImportStep = () => {
    setCurrentStep(getImportStepForMethod());
  };

  const goBack = () => {
    if (scannerVisible) {
      setScannerVisible(false);
    } else if (currentStep === SETUP_STEPS.NAME) {
      if (collectImportBeforeProfile && importedSeedReady) {
        setImportedSeedReady(false);
        setCurrentStep(getImportStepForMethod());
        return;
      }

      props.navigation.goBack();
    } else if (currentStep === SETUP_STEPS.PASSWORD) {
      setCurrentStep(SETUP_STEPS.NAME);
    } else if (currentStep === SETUP_STEPS.BIOMETRICS) {
      setCurrentStep(SETUP_STEPS.PASSWORD);
    } else if (currentStep === SETUP_STEPS.SEED_INTRO) {
      backToSecurityStep();
    } else if (currentStep === SETUP_STEPS.SHIELDED_ADDRESS) {
      setSeedWordStep(seedWordPageCount);
      setCurrentStep(SETUP_STEPS.SEED_WORDS);
    } else if (currentStep === SETUP_STEPS.IMPORT_SHIELDED_ADDRESS) {
      if (collectImportBeforeProfile) {
        backToSecurityStep();
      } else {
        backToImportStep();
      }
    } else if (
      currentStep === SETUP_STEPS.IMPORT_SEED ||
      currentStep === SETUP_STEPS.IMPORT_TEXT ||
      currentStep === SETUP_STEPS.IMPORT_NFC
    ) {
      if (collectImportBeforeProfile) {
        props.navigation.goBack();
      } else {
        backToSecurityStep();
      }
    } else if (seedWordStep > 0) {
      setSeedWordStep(step => step - 1);
    } else {
      setCurrentStep(SETUP_STEPS.SEED_INTRO);
    }
  };

  const renderStep = () => {
    if (currentStep === SETUP_STEPS.NAME) {
      return (
        <ChooseName
          profileName={profileName}
          setProfileName={setProfileName}
          walletAvatar={walletAvatar}
          setWalletAvatar={setWalletAvatar}
          onNext={() => setCurrentStep(SETUP_STEPS.PASSWORD)}
        />
      );
    }

    if (currentStep === SETUP_STEPS.PASSWORD) {
      return (
        <CreatePassword
          password={password}
          setPassword={setPassword}
          confirmPassword={confirmPassword}
          setConfirmPassword={setConfirmPassword}
          onNext={continueFromPassword}
        />
      );
    }

    if (currentStep === SETUP_STEPS.BIOMETRICS) {
      return (
        <UseBiometrics
          supportedBiometryType={supportedBiometryType}
          setUseBiometrics={setUseBiometrics}
          onNext={startWalletSetup}
        />
      );
    }

    if (currentStep === SETUP_STEPS.SHIELDED_ADDRESS) {
      return (
        <ShieldedAddressSetup
          onComplete={useSeedAsZ =>
            createProfile(newSeed, testProfile, useSeedAsZ)
          }
          showHeader={false}
        />
      );
    }

    if (currentStep === SETUP_STEPS.IMPORT_SHIELDED_ADDRESS) {
      return (
        <ShieldedAddressSetup
          actionLabel="Complete"
          body="Use this Secret Recovery Phrase for private transactions and encryption capabilities. Recommended."
          onComplete={completeImportShieldedSetup}
          optionLabel="Restore shielded address"
          showHeader={false}
          title="Restore shielded address"
        />
      );
    }

    if (currentStep === SETUP_STEPS.IMPORT_SEED) {
      return (
        <ImportSeed
          importedSeed={importedSeed}
          onComplete={() => completeImportedSeed()}
          onImportProgressChange={setImportSeedEntryProgress}
          setImportedSeed={setImportedSeed}
        />
      );
    }

    if (currentStep === SETUP_STEPS.IMPORT_TEXT) {
      return (
        <ImportText
          importedSeed={importedSeed}
          onComplete={() => completeImportedSeed()}
          setImportedSeed={setImportedSeed}
        />
      );
    }

    if (currentStep === SETUP_STEPS.IMPORT_NFC) {
      return (
        <ImportNfc
          autoStart={collectImportBeforeProfile}
          onComplete={seed => completeImportedSeed(seed)}
          setImportedSeed={setImportedSeed}
        />
      );
    }

    if (currentStep === SETUP_STEPS.SEED_INTRO || !newSeed) {
      return (
        <SeedIntro
          ensureNewSeed={ensureNewSeed}
          onNext={continueToSeedWords}
          showHeader={false}
        />
      );
    }

    return (
      <SeedWords
        formStep={seedWordStep}
        setFormStep={setSeedWordStep}
        newSeed={newSeed}
        onBack={() => setCurrentStep(SETUP_STEPS.SEED_INTRO)}
        onComplete={() => setCurrentStep(SETUP_STEPS.SHIELDED_ADDRESS)}
        showHeader={false}
      />
    );
  };

  if (scannerVisible) {
    return <ScanSeed cancel={closeScanner} onScan={handleScan} />;
  }

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />
      <CompactSetupHeader onBack={goBack} progress={progress} />
      {renderStep()}
    </View>
  );
}
