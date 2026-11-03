const mockCreateUpdateIdentityTransaction = jest.fn();
const mockCreateUpdateIdentityWithCurrencyTransferTransaction = jest.fn();

jest.mock('../../vrpc/vrpcInterface', () => ({
  __esModule: true,
  default: {
    getVerusIdInterface: () => ({
      createUpdateIdentityTransaction: mockCreateUpdateIdentityTransaction,
      createUpdateIdentityWithCurrencyTransferTransaction: mockCreateUpdateIdentityWithCurrencyTransferTransaction,
    }),
  },
}));
jest.mock('../../api/channels/vrpc/callCreators', () => ({
  getSpendableUtxos: jest.fn().mockResolvedValue([]),
  getTransaction: jest.fn(),
  sendRawTransaction: jest.fn(),
}));
jest.mock('../../api/channels/verusid/requests/getIdentity', () => ({getIdentity: jest.fn()}));
jest.mock('../../constants/constants', () => ({I_ADDRESS_VERSION: 102}));

const {
  BigNumber,
  CompactIAddressObject,
  ContentMultiMapRemoveKey,
  DataStringKey,
  Identity,
  IdentityID,
  IdentityUpdateRequestDetails,
  PartialIdentity,
  VdxfUniValue,
} = require('verus-typescript-primitives');
const {VerusIdInterface} = require('verusid-ts-client');
const {networks, smarttxs, Transaction} = require('@bitgo/utxo-lib');
const {
  createUpdateIdentityTx,
  createUpdateIdentityTxWithUtxos,
  createUpdateIdentityWithCurrencyTransferTx,
} = require('../../api/channels/verusid/requests/updateIdentity');
const {getSpendableUtxos} = require('../../api/channels/vrpc/callCreators');

const SYSTEM_ID = 'iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq';
const EMPTY_KEY = 'iJitWFN8PY37GrBVtF38HyftG8WohWipbL';
const currentIdentity = {
  version: 3, flags: 0, name: 'T1', parent: SYSTEM_ID, systemid: SYSTEM_ID,
  primaryaddresses: ['RWCqoWfSKaDoGeiwD6ZxX2dwkMx2oHJM56'], minimumsignatures: 1,
  revocationauthority: EMPTY_KEY, recoveryauthority: EMPTY_KEY,
  contentmap: {}, contentmultimap: {}, timelock: 0,
};
const transaction = contentmultimap => smarttxs.createUnfundedIdentityUpdate(
  Identity.fromJson({...currentIdentity, contentmultimap}).toBuffer().toString('hex'),
  networks.verus, 120,
);
const originalTx = transaction({});
const makeRequest = contentmultimap => new IdentityUpdateRequestDetails({
  identity: PartialIdentity.fromJson({name: 'T1', parent: SYSTEM_ID, contentmultimap}),
  requestID: CompactIAddressObject.fromAddress(EMPTY_KEY, 'VRSCTEST'),
  systemID: IdentityID.fromAddress(SYSTEM_ID),
  expiryHeight: new BigNumber(900),
  txid: Buffer.from(Transaction.fromHex(originalTx, networks.verus).getId(), 'hex').reverse(),
});
const prepare = (request, localUploadCrypto) => createUpdateIdentityTx(
  SYSTEM_ID, request, 'change-address', originalTx, 100, false, true, localUploadCrypto, 100,
);
const useRealClient = () => {
  const client = new VerusIdInterface(SYSTEM_ID, 'https://example.invalid');
  mockCreateUpdateIdentityTransaction.mockImplementation((...args) =>
    client.createUpdateIdentityTransaction(...args));
};

describe('identity update content normalization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateUpdateIdentityTransaction.mockResolvedValue({hex: 'result'});
    mockCreateUpdateIdentityWithCurrencyTransferTransaction.mockResolvedValue({hex: 'transfer-result'});
  });

  it.each([
    ['standard update', prepare, mockCreateUpdateIdentityTransaction],
    ['update with UTXOs', (identity, localUploadCrypto) => createUpdateIdentityTxWithUtxos({
      systemId: SYSTEM_ID, identity, isTestnet: true, currentHeight: 100, localUploadCrypto,
    }), mockCreateUpdateIdentityTransaction],
    ['update with transfer', (identity, localUploadCrypto) => createUpdateIdentityWithCurrencyTransferTx({
      systemId: SYSTEM_ID, identity, isTestnet: true, currentHeight: 100, localUploadCrypto,
    }), mockCreateUpdateIdentityWithCurrencyTransferTransaction],
  ])('accepts a supported upload and forwards wallet crypto for a %s', async (_, build, sdkBuild) => {
    const request = IdentityUpdateRequestDetails.fromCLIJson({
      name: 'T1', parent: SYSTEM_ID,
      contentmultimap: {[DataStringKey.vdxfid]: {data: {message: 'upload', createmmr: true}}},
    });
    const originalBytes = request.toBuffer();
    const localUploadCrypto = {
      randomBytes: jest.fn(), encrypt: jest.fn(), decryptData: jest.fn(),
    };
    expect(request.containsSignData()).toBe(true);
    expect(request.signDataMap.getByAddress(DataStringKey.vdxfid).createMMR).toBe(true);

    await expect(build(request, localUploadCrypto)).resolves.toEqual({
      hex: sdkBuild === mockCreateUpdateIdentityTransaction ? 'result' : 'transfer-result',
    });
    expect(sdkBuild).toHaveBeenCalledTimes(1);
    expect(sdkBuild.mock.calls[0][0]).toBe(request);
    if (sdkBuild === mockCreateUpdateIdentityTransaction) {
      const args = sdkBuild.mock.calls[0];
      expect(args[5]).toBe(SYSTEM_ID);
      expect(args[8]).toBe(100);
      expect(args.slice(10)).toEqual([true, true, false, localUploadCrypto.decryptData, localUploadCrypto]);
    } else {
      expect(sdkBuild.mock.calls[0][6]).toEqual(expect.objectContaining({
        chainIAddr: SYSTEM_ID, currentHeight: 100, isTestnet: true,
        parseVdxfObjects: true, decryptData: localUploadCrypto.decryptData, localUploadCrypto,
      }));
    }
    expect(request.toBuffer()).toEqual(originalBytes);
    expect(getSpendableUtxos).not.toHaveBeenCalled();
  });

  it('builds an identity without empty keys while preserving signed request bytes and explicit map presence', async () => {
    useRealClient();
    const request = makeRequest({[EMPTY_KEY]: []});
    const originalBytes = request.toBuffer();
    const result = await prepare(request);
    const passed = mockCreateUpdateIdentityTransaction.mock.calls[0][0];

    expect(result.identity.toJson().contentmultimap).toEqual({});
    expect(passed.identity.containsContentMultiMap()).toBe(true);
    expect(passed.requestID.rootSystemName).toBe('VRSCTEST');
    expect(request.toBuffer()).toEqual(originalBytes);
    expect(request.toCLIJson().contentmultimap).toEqual({[EMPTY_KEY]: []});
    expect(mockCreateUpdateIdentityTransaction.mock.calls[0].slice(1)).toEqual([
      'change-address', originalTx, 100, undefined, SYSTEM_ID, undefined,
      undefined, 100, undefined, true, true, false, undefined, undefined,
    ]);
  });

  it('retains actual additions and explicit removal operations when dropping an empty key', async () => {
    useRealClient();
    const contentmultimap = {
      [EMPTY_KEY]: [],
      [SYSTEM_ID]: [{[DataStringKey.vdxfid]: 'retained value'}],
      [ContentMultiMapRemoveKey.vdxfid]: [{
        [ContentMultiMapRemoveKey.vdxfid]: {version: 1, action: 3, entrykey: SYSTEM_ID},
      }],
    };
    const request = makeRequest(contentmultimap);
    const originalBytes = request.toBuffer();
    const result = await prepare(request);
    expect(result.identity.toJson().contentmultimap).toEqual({
      [SYSTEM_ID]: contentmultimap[SYSTEM_ID],
      [ContentMultiMapRemoveKey.vdxfid]: contentmultimap[ContentMultiMapRemoveKey.vdxfid],
    });
    for (const key of [SYSTEM_ID, ContentMultiMapRemoveKey.vdxfid]) {
      // Built identities use full VDXF values; requests use compact values.
      expect(result.identity.contentMultiMap.kvContent.getByAddress(key)[0].toBuffer())
        .toEqual(VdxfUniValue.fromJson(contentmultimap[key][0]).toBuffer());
    }
    expect(request.toBuffer()).toEqual(originalBytes);
  });

  it.each([undefined, {}])('preserves omitted or explicitly empty maps without cloning: %s', contentmultimap => {
    useRealClient();
    const request = makeRequest(contentmultimap);
    const originalBytes = request.toBuffer();
    return prepare(request).then(result => {
      const passed = mockCreateUpdateIdentityTransaction.mock.calls[0][0];
      expect(passed).toBe(request);
      expect(passed.identity.containsContentMultiMap()).toBe(contentmultimap !== undefined);
      expect(passed.toCLIJson().contentmultimap).toEqual(contentmultimap);
      expect(result.identity.toJson().contentmultimap).toEqual({});
      expect(request.toBuffer()).toEqual(originalBytes);
    });
  });

  it('accepts daemon key ordering through the real client while still rejecting value changes', async () => {
    const key = DataStringKey.vdxfid;
    const removeKey = ContentMultiMapRemoveKey.vdxfid;
    const additions = [{[key]: 'second'}, {[key]: 'first'}, {[key]: 'second'}];
    const removals = [1, 2].map(action => ({[removeKey]: {
      version: 1, action, entrykey: key, valuehash: 'ab'.repeat(32),
    }}));
    const request = new IdentityUpdateRequestDetails({
      identity: PartialIdentity.fromJson({
        name: 'T1', parent: SYSTEM_ID,
        contentmultimap: {[key]: additions, [removeKey]: removals},
      }),
    });
    const originalBytes = request.toBuffer();
    const serverTx = transaction({[removeKey]: removals, [key]: additions});
    const client = new VerusIdInterface(SYSTEM_ID, 'https://example.invalid');
    const validate = (details, tx = serverTx) => client.prepareIdentityUpdateTransaction(
      details, originalTx, 100, tx, true, true,
    );

    // verusid-ts-client 50fa3ffa accepts the daemon's outer-key order itself.
    await expect(validate(request)).resolves.toHaveProperty('identityOnOutput');
    mockCreateUpdateIdentityTransaction.mockImplementation(details => validate(details));
    const result = await prepare(request);
    expect(Object.keys(result.identityOnOutput.toJson().contentmultimap)).toEqual([removeKey, key]);
    expect(result.identityOnOutput.toJson().contentmultimap[key]).toEqual(additions);
    expect(result.identityOnOutput.toJson().contentmultimap[removeKey]).toEqual(removals);
    expect(request.toBuffer()).toEqual(originalBytes);

    for (const changed of [
      {[removeKey]: removals, [key]: [additions[1], additions[0], additions[2]]},
      {[removeKey]: removals, [key]: additions.slice(1)},
      {[removeKey]: [...removals].reverse(), [key]: additions},
      {[removeKey]: removals, [key]: [{[key]: 'different value'}]},
    ]) {
      await expect(validate(request, transaction(changed)))
        .rejects.toThrow('Unexpected contentmultimap entries in identity transaction');
    }
    expect(request.toBuffer()).toEqual(originalBytes);
  });
});
