#!/usr/bin/env node

const assert = require('node:assert');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const {transformFileSync} = require('@babel/core');
const {
  GenericRequest,
  SpendableKeyDetails,
  SpendableKeyDetailsOrdinalVDXFObject,
} = require('verus-typescript-primitives');

const loadAppModule = relativePath => {
  const filename = path.resolve(__dirname, '..', relativePath);
  const transformed = transformFileSync(filename, {
    configFile: path.resolve(__dirname, '../babel.config.js'),
  });
  const appModule = new Module(filename, module);
  appModule.filename = filename;
  appModule.paths = Module._nodeModulePaths(path.dirname(filename));
  appModule._compile(transformed.code, filename);
  return appModule.exports;
};

const loadPendingStorageModule = storedRequests => {
  const relativePath = 'src/utils/deeplink/pendingDeeplinkStorage.js';
  const filename = path.resolve(__dirname, '..', relativePath);
  const transformed = transformFileSync(filename, {
    configFile: path.resolve(__dirname, '../babel.config.js'),
  });
  const appModule = new Module(filename, module);
  appModule.filename = filename;
  appModule.paths = Module._nodeModulePaths(path.dirname(filename));
  const originalLoad = Module._load;

  Module._load = function load(request, parent, isMain) {
    if (request === '../../../env/index') {
      return {DEEPLINK_STORAGE_INTERNAL_KEY: 'pending-deeplink-test'};
    }
    if (request === '../crypto/hash') {
      return {sha256: () => Buffer.alloc(32)};
    }
    if (request === '../keychain/secureStore') {
      return {
        SecureStorage: {
          getItem: async () => JSON.stringify(storedRequests),
          setItem: async () => {},
          removeItem: async () => {},
        },
      };
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    appModule._compile(transformed.code, filename);
  } finally {
    Module._load = originalLoad;
  }

  return appModule.exports;
};

const system = ({currencies = [], identities = [], id = 'VRSCTEST'}) => ({
  systemId: `${id}-system-id`,
  coinObj: {id, display_ticker: id},
  currencies,
  identities,
});
const balance = (name, amount) => ({
  currencyId: `${name}-currency-id`,
  amount,
  display: {name},
});
const identity = name => ({
  identityAddress: `${name}-identity-id`,
  fullyQualifiedName: name,
});

const main = async () => {
  const {
    getSpendableKeyClaimLabel,
    getSpendableKeyReviewModel,
    getSpendableKeyReviewSubtitle,
    getSpendableKeySummaryLabel,
    getSpendableKeyWalletGate,
  } = loadAppModule('src/utils/spendableKey/spendableKeyReview.js');

  const oneBalance = getSpendableKeyReviewModel({
    systems: [system({currencies: [balance('VRSCTEST', '0.0014')]})],
  });
  assert(oneBalance.singleBalance);
  assert.strictEqual(oneBalance.identityCount, 0);
  assert.strictEqual(
    getSpendableKeyReviewSubtitle(oneBalance),
    'Review the balance found on this key.',
  );
  assert.strictEqual(
    getSpendableKeyClaimLabel(oneBalance),
    'Claim 0.0014 VRSCTEST',
  );

  const multipleBalances = getSpendableKeyReviewModel({
    systems: [
      system({
        currencies: [
          balance('VRSCTEST', '0.0014'),
          balance('Bridge.vETH', '0.025'),
          balance('USDT.vETH', '5.00'),
        ],
      }),
    ],
  });
  assert.strictEqual(multipleBalances.singleBalance, null);
  assert.strictEqual(getSpendableKeySummaryLabel(multipleBalances), '3 balances');
  assert.strictEqual(
    getSpendableKeyClaimLabel(multipleBalances),
    'Claim 3 balances',
  );

  const balanceAndIdentity = getSpendableKeyReviewModel({
    systems: [
      system({
        currencies: [balance('VRSCTEST', '0.0014')],
        identities: [identity('ClaimDemo.VRSCTEST@')],
      }),
    ],
  });
  assert(balanceAndIdentity.singleBalance);
  assert.strictEqual(
    getSpendableKeyClaimLabel(balanceAndIdentity),
    'Claim balance and VerusID',
  );

  const mixed = getSpendableKeyReviewModel({
    systems: [
      system({
        currencies: [balance('VRSCTEST', '0.0014')],
        identities: [identity('ClaimDemo.VRSCTEST@')],
      }),
      system({
        id: 'VeryLongSystemName',
        currencies: [
          balance('Bridge.vETH', '0.025'),
          balance('A very long currency name that must wrap', '5.00'),
        ],
        identities: [identity('A.Very.Long.VerusID.Name.VRSCTEST@')],
      }),
    ],
  });
  assert.strictEqual(mixed.hasMultipleSystems, true);
  assert.strictEqual(mixed.balanceCount, 3);
  assert.strictEqual(mixed.identityCount, 2);
  assert.strictEqual(getSpendableKeySummaryLabel(mixed), '3 balances · 2 VerusIDs');
  assert.strictEqual(getSpendableKeyClaimLabel(mixed), 'Claim 5 items');

  const empty = getSpendableKeyReviewModel({systems: [system({})]});
  assert.strictEqual(empty.systems.length, 0);
  assert.strictEqual(empty.itemCount, 0);

  assert.deepStrictEqual(
    getSpendableKeyWalletGate({
      activeAccountMatchesRequest: false,
      matchingAccountCount: 0,
      signedIn: false,
    }),
    {
      actionLabel: 'Set up wallet',
      helper:
        'Set up a wallet first. You will return to this saved claim when setup is complete.',
      type: 'setup',
    },
  );
  assert.strictEqual(
    getSpendableKeyWalletGate({
      activeAccountMatchesRequest: false,
      matchingAccountCount: 1,
      signedIn: false,
    }).actionLabel,
    'Unlock wallet',
  );
  assert.strictEqual(
    getSpendableKeyWalletGate({
      activeAccountMatchesRequest: false,
      matchingAccountCount: 1,
      signedIn: true,
    }).actionLabel,
    'Switch wallet',
  );
  assert.strictEqual(
    getSpendableKeyWalletGate({
      activeAccountMatchesRequest: true,
      matchingAccountCount: 1,
      signedIn: true,
    }),
    null,
  );

  const screenSource = fs.readFileSync(
    path.resolve(
      __dirname,
      '../src/containers/DeepLink/SpendableKeyRequestInfo/SpendableKeyRequestInfo.js',
    ),
    'utf8',
  );
  assert(screenSource.includes('completeWithDelivery(response, [detailIndex])'));
  assert(screenSource.includes('claimResult.partialError'));
  assert(screenSource.includes('<CopyAction'));
  assert(screenSource.includes('openUrl(explorerUrl)'));
  assert(!screenSource.includes('styles.requestCard'));
  assert(!screenSource.includes('truncate(identity.identityAddress)'));
  assert(screenSource.includes("status === 'scanning' || status === 'decrypting'"));
  assert(screenSource.includes('<GenericRequestLoading'));

  const createProfileSource = fs.readFileSync(
    path.resolve(
      __dirname,
      '../src/containers/Onboard/CreateProfile/CreateProfile.js',
    ),
    'utf8',
  );
  assert(createProfileSource.includes('getPendingDeeplinkReplay'));
  assert(createProfileSource.includes('setDeeplinkUrl(replay.url, replay.passthrough)'));

  const loginSource = fs.readFileSync(
    path.resolve(__dirname, '../src/containers/Login/Login.js'),
    'utf8',
  );
  assert(loginSource.includes('setAddWalletVisible(true)'));
  assert(loginSource.includes('resumePendingDeeplinkId'));

  const request = new GenericRequest({
    details: [
      new SpendableKeyDetailsOrdinalVDXFObject({
        data: new SpendableKeyDetails({
          data: Buffer.alloc(32, 7),
          seedFormat: SpendableKeyDetails.SEED_FORMAT_BIP39,
          encryptionFormat: SpendableKeyDetails.ENCRYPTION_FORMAT_NONE,
        }),
      }),
    ],
    flags: GenericRequest.FLAG_IS_TESTNET,
  });
  const savedRequest = {
    id: 'saved-claim-id',
    requestBufferString: request.toBuffer().toString('hex'),
    completed: false,
  };
  const pendingStorage = loadPendingStorageModule([savedRequest]);
  const replay = await pendingStorage.getPendingDeeplinkReplay(
    savedRequest.id,
  );
  assert.strictEqual(replay.url, request.toWalletDeeplinkUri());
  assert.strictEqual(replay.passthrough.pendingDeeplinkId, savedRequest.id);
  assert.strictEqual(replay.passthrough.replayedPendingDeeplink, true);
  assert.strictEqual(replay.passthrough.skipWalletBackupRequests, true);

  console.log(
    JSON.stringify(
      {
        passed: true,
        assertions: {
          adaptiveReviewStates: true,
          longNamesRemainModelled: true,
          zeroValueTypesHidden: true,
          walletGateContract: true,
          successTxidsAndPartialErrorsPreserved: true,
          sharedRequestLoadingPreserved: true,
          savedClaimReplayWired: true,
          savedClaimReplayRebuildsMissingUri: true,
        },
      },
      null,
      2,
    ),
  );
};

main().catch(error => {
  console.error(error?.stack || error);
  process.exitCode = 1;
});
