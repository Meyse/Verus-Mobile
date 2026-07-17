import { createAlert, resolveAlert } from "../../../alert/dispatchers/alert"

export const canRetryDlightInitialization = (chainTicker) => {
  return createAlert(
    'Blockchain Sync Failed',
    'Something went wrong while trying to synchronize with the ' + chainTicker + ' blockchain. This may cause issues with private transactions' +
    (chainTicker === 'VRSC' ? ' and Verus identity management.' : '.') + '\n\nWould you like to retry?\n\nThis can always be done later in settings.',
    [
      {
        text: 'No',
        onPress: () => resolveAlert(false),
        style: 'cancel',
      },
      {text: 'Yes', onPress: () => resolveAlert(true)},
    ],
    {
      cancelable: false,
    },
  )
}

export const canShowSeed = () => {
  return createAlert(
    'Warning',
    "The next screen will display your unencrypted wallet recovery secrets and private keys in plain text.\n\n" +
    "Anyone with access to this information can control the associated funds.\n\nAre you sure you " +
    "would like to proceed?",
    [
      {
        text: 'No',
        onPress: () => resolveAlert(false),
        style: 'cancel',
      },
      {text: 'Yes', onPress: () => resolveAlert(true)},
    ],
    {
      cancelable: false,
    },
  )
}

export const canCopySeed = () => {
  return createAlert(
    "Use the same recovery secret?",
    "Would you like to use the same recovery secret as both your primary and secondary recovery secrets?" +
      "\n\n" +
      "If you use private addresses and transactions, this would make your private addresses derived from the same source as your transparent addresses.",
    [
      {
        text: "No",
        onPress: () => resolveAlert(false),
        style: "cancel",
      },
      { text: "Yes", onPress: () => resolveAlert(true) },
    ],
    {
      cancelable: false,
    }
  );
}

export const blockchainQuitError = (chainTicker) => {
  return createAlert(
    'Blockchain Stop Failed',
    'Something went wrong while trying to stop synchronizing with the ' + chainTicker + ' blockchain. This may cause issues with private transactions' +
    chainTicker === 'VRSC' ? ' and Verus identity management.' : '.' + '\n\nIf they occur, try restarting Verus mobile.',
    [
      {
        text: 'No',
        onPress: () => resolveAlert(false),
        style: 'cancel',
      },
      {text: 'Yes', onPress: () => resolveAlert(true)},
    ],
    {
      cancelable: false,
    },
  )
}
