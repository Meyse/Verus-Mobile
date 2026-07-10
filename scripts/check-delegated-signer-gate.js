#!/usr/bin/env node

const assert = require('assert');
const path = require('path');
const Module = require('module');
const {transformFileSync} = require('@babel/core');

const loadAppModule = relativePath => {
  const filename = path.resolve(__dirname, '..', relativePath);
  const transformed = transformFileSync(filename, {
    configFile: path.resolve(__dirname, '..', 'babel.config.js'),
  });
  const appModule = new Module(filename, module);
  appModule.filename = filename;
  appModule.paths = Module._nodeModulePaths(path.dirname(filename));
  appModule._compile(transformed.code, filename);
  return appModule.exports;
};

const {
  DELEGATED_SIGNER_GATE_OUTCOMES,
  DELEGATED_SIGNER_SELECTION_MODES,
  createDelegatedSignerAccountError,
  getDelegatedSignerUnlockPlan,
  requestDelegatedSignerWallet,
  validateWithDelegatedSignerGate,
} = loadAppModule('src/utils/deeplink/delegatedSignerGate.js');

const UNLOCK_CANCELLED = 'WALLET_UNLOCK_CANCELLED';
const mainnetAccount = accountHash => ({accountHash, testnetOverrides: {}});
const testnetAccount = accountHash => ({
  accountHash,
  testnetOverrides: {VRSCTEST: true},
});

const makeUnlockGate = ({accounts, requestIsTestnet, requestUnlock}) => () =>
  requestDelegatedSignerWallet({
    accounts,
    requestIsTestnet,
    requestUnlock,
    unlockCancelledCode: UNLOCK_CANCELLED,
    unlockOptions: {reason: 'acceptance-harness'},
  });

const run = async () => {
  const results = [];

  {
    let validationCalls = 0;
    const result = await validateWithDelegatedSignerGate({
      requiresDelegatedSignerCheck: true,
      signedIn: false,
      validateRequest: async () => {
        validationCalls += 1;
      },
      unlockForDelegatedSigner: makeUnlockGate({
        accounts: [mainnetAccount('mainnet')],
        requestIsTestnet: true,
        requestUnlock: async () => assert.fail('unlock must not open'),
      }),
    });
    assert.strictEqual(
      result.outcome,
      DELEGATED_SIGNER_GATE_OUTCOMES.NO_MATCHING_PROFILES,
    );
    assert.strictEqual(validationCalls, 0);
    results.push('zero matching profiles');
  }

  {
    let receivedAccountHashes;
    const plan = getDelegatedSignerUnlockPlan(
      [mainnetAccount('mainnet'), testnetAccount('only-testnet')],
      true,
    );
    const result = await validateWithDelegatedSignerGate({
      requiresDelegatedSignerCheck: true,
      signedIn: false,
      validateRequest: async () => {},
      unlockForDelegatedSigner: makeUnlockGate({
        accounts: [mainnetAccount('mainnet'), testnetAccount('only-testnet')],
        requestIsTestnet: true,
        requestUnlock: async options => {
          receivedAccountHashes = options.accountHashes;
        },
      }),
    });
    assert.strictEqual(
      plan.selectionMode,
      DELEGATED_SIGNER_SELECTION_MODES.SINGLE_PROFILE,
    );
    assert.deepStrictEqual(receivedAccountHashes, ['only-testnet']);
    assert.strictEqual(
      result.outcome,
      DELEGATED_SIGNER_GATE_OUTCOMES.VALIDATED,
    );
    results.push('one matching profile');
  }

  {
    let receivedAccountHashes;
    const accounts = [
      testnetAccount('testnet-a'),
      mainnetAccount('mainnet'),
      testnetAccount('testnet-b'),
    ];
    const plan = getDelegatedSignerUnlockPlan(accounts, true);
    const result = await validateWithDelegatedSignerGate({
      requiresDelegatedSignerCheck: true,
      signedIn: false,
      validateRequest: async () => {},
      unlockForDelegatedSigner: makeUnlockGate({
        accounts,
        requestIsTestnet: true,
        requestUnlock: async options => {
          receivedAccountHashes = options.accountHashes;
        },
      }),
    });
    assert.strictEqual(
      plan.selectionMode,
      DELEGATED_SIGNER_SELECTION_MODES.CHOOSE_PROFILE,
    );
    assert.deepStrictEqual(receivedAccountHashes, ['testnet-a', 'testnet-b']);
    assert.strictEqual(
      result.outcome,
      DELEGATED_SIGNER_GATE_OUTCOMES.VALIDATED,
    );
    results.push('multiple matching profiles');
  }

  for (const cancellationPoint of ['chooser', 'unlock']) {
    let validationCalls = 0;
    const cancellation = new Error(`cancel from ${cancellationPoint}`);
    cancellation.code = UNLOCK_CANCELLED;
    const accounts =
      cancellationPoint === 'chooser'
        ? [testnetAccount('a'), testnetAccount('b')]
        : [testnetAccount('a')];
    const result = await validateWithDelegatedSignerGate({
      requiresDelegatedSignerCheck: true,
      signedIn: false,
      validateRequest: async () => {
        validationCalls += 1;
      },
      unlockForDelegatedSigner: makeUnlockGate({
        accounts,
        requestIsTestnet: true,
        requestUnlock: async () => {
          throw cancellation;
        },
      }),
    });
    assert.strictEqual(
      result.outcome,
      DELEGATED_SIGNER_GATE_OUTCOMES.CANCELLED,
    );
    assert.strictEqual(validationCalls, 0);
    results.push(`cancel from ${cancellationPoint}`);
  }

  {
    let validationCalls = 0;
    let unlockCalls = 0;
    const result = await validateWithDelegatedSignerGate({
      requiresDelegatedSignerCheck: true,
      signedIn: true,
      validateRequest: async () => {
        validationCalls += 1;
      },
      unlockForDelegatedSigner: async () => {
        unlockCalls += 1;
      },
    });
    assert.strictEqual(validationCalls, 1);
    assert.strictEqual(unlockCalls, 0);
    assert.strictEqual(
      result.outcome,
      DELEGATED_SIGNER_GATE_OUTCOMES.VALIDATED,
    );
    results.push('signed in with acceptable wallet');
  }

  {
    let validationCalls = 0;
    let unlockCalls = 0;
    const result = await validateWithDelegatedSignerGate({
      requiresDelegatedSignerCheck: true,
      signedIn: true,
      validateRequest: async () => {
        validationCalls += 1;
        if (validationCalls === 1) {
          throw createDelegatedSignerAccountError();
        }
      },
      unlockForDelegatedSigner: async () => {
        unlockCalls += 1;
        return {outcome: DELEGATED_SIGNER_GATE_OUTCOMES.UNLOCKED};
      },
    });
    assert.strictEqual(validationCalls, 2);
    assert.strictEqual(unlockCalls, 1);
    assert.strictEqual(
      result.outcome,
      DELEGATED_SIGNER_GATE_OUTCOMES.VALIDATED,
    );
    results.push('signed in with wrong wallet');
  }

  console.log(`Delegated signer gate acceptance: ${results.length} passed`);
  results.forEach(result => console.log(`- ${result}`));
};

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
