jest.mock('../../vrpc/vrpcInterface', () => ({
  __esModule: true,
  default: {initEndpoint: jest.fn()},
}));
jest.mock('../../api/channels/vrpc/requests/getBlock', () => ({getBlock: jest.fn()}));
jest.mock('../../api/channels/vrpc/requests/getSignatureInfo', () => ({getSignatureInfo: jest.fn()}));
jest.mock('../../api/channels/verusid/callCreators', () => ({
  getIdentity: jest.fn(),
  getFriendlyNameMap: jest.fn(async () => ({})),
}));
jest.mock('../../api/channels/verusid/requests/getIdentityContent', () => ({
  getIdentityContent: jest.fn(),
}));
jest.mock('../../api/channels/verusid/requests/updateIdentity', () => ({
  createUpdateIdentityTx: jest.fn(),
  getUpdatableIdentity: jest.fn(),
}));
jest.mock('../../api/channels/vrpc/callCreators', () => ({
  getInfo: jest.fn(async () => ({result: {
    chainid: 'iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq', blocks: 100, longestchain: 100,
  }})),
}));
jest.mock('../../CoinData/CoinDirectory', () => ({
  CoinDirectory: {getBasicCoinObj: () => ({
    system_id: 'iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq',
    vrpc_endpoints: ['https://example.invalid'],
  })},
}));
jest.mock('../../CoinData/CoinData', () => ({getSystemNameFromSystemId: () => null}));
jest.mock('../../../store', () => ({
  __esModule: true,
  default: {
    getState: () => ({authentication: {
      activeAccount: {accountHash: 'upload-test-account'}, sessionEpoch: 1,
    }}),
    subscribe: jest.fn(() => jest.fn()),
  },
}));

const {
  CompactIAddressObject,
  ContentMultiMapRemoveKey,
  DataStringKey,
  GenericResponse,
  Identity,
  IdentityUpdateRequestDetails,
  IdentityUpdateRequestOrdinalVDXFObject,
  IDENTITY_CREDENTIAL,
  toIAddress,
} = require('verus-typescript-primitives');
const {getIdentity} = require('../../api/channels/verusid/callCreators');
const {getIdentityContent} = require('../../api/channels/verusid/requests/getIdentityContent');
const {createUpdateIdentityTx, getUpdatableIdentity} = require('../../api/channels/verusid/requests/updateIdentity');
const {getInfo} = require('../../api/channels/vrpc/callCreators');
const store = require('../../../store').default;
const {handleIdentityUpdateRequestDetailsVDXFObject} = require('../../deeplink/handlers/identityUpdateRequestDetailsHandler');

const {getGenericRequestRejection} = require('../../deeplink/genericRequestRejection');

const SYSTEM_ID = 'iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq';
const SUBJECT_ID = toIAddress('cmm-subject', 'VRSCTEST');
const SIGNER_ID = toIAddress('cmm-requester', 'VRSCTEST');
const KEY = DataStringKey.vdxfid;
const oldContent = {[KEY]: [{[KEY]: 'previously published'}]};
const newContent = {[KEY]: [{[KEY]: 'new value'}]};
let subjectIdentity;
let historyResponse;

const makeRequest = (contentmultimap, updates = {}) => {
  const details = IdentityUpdateRequestDetails.fromCLIJson({
    name: 'cmm-subject',
    parent: SYSTEM_ID,
    ...(contentmultimap === undefined ? {} : {contentmultimap}),
    ...updates,
  });
  return {
    isTestnet: () => true,
    getDetails: () => new IdentityUpdateRequestOrdinalVDXFObject({data: details}),
    signature: {
      identityID: CompactIAddressObject.fromAddress(SIGNER_ID),
      systemID: CompactIAddressObject.fromAddress(SYSTEM_ID),
    },
  };
};

const prepareDelta = contentmultimap => {
  createUpdateIdentityTx.mockResolvedValue({
    identity: Identity.fromJson({...subjectIdentity.identity, contentmultimap}),
    hex: 'prepared-update-hex',
  });
};

const handleRequest = request => handleIdentityUpdateRequestDetailsVDXFObject(
  request,
  new GenericResponse(),
  0,
);

beforeEach(() => {
  jest.clearAllMocks();
  const identity = Identity.fromJson({
    version: 3,
    flags: 0,
    timelock: 0,
    name: 'cmm-subject',
    parent: SYSTEM_ID,
    systemid: SYSTEM_ID,
    minimumsignatures: 1,
    primaryaddresses: ['RTqQe58LSj2yr5CrwYFwcsAQ1edQwmrkUU'],
    recoveryauthority: SUBJECT_ID,
    revocationauthority: SUBJECT_ID,
    contentmap: {},
    contentmultimap: oldContent,
  });
  subjectIdentity = {
    identity: identity.toJson(),
    fullyqualifiedname: 'cmm-subject.VRSCTEST@',
    blockheight: 42,
    txid: 'canonical-identity-txid',
    vout: 0,
  };
  historyResponse = {result: {
    blockheight: 99,
    txid: 'untrusted-history-metadata',
    identity: {...subjectIdentity.identity, flags: 32768, contentmultimap: oldContent},
  }};
  getIdentity.mockResolvedValue({result: subjectIdentity});
  getUpdatableIdentity.mockResolvedValue({identity, tx: 'canonical-identity-hex'});
  getIdentityContent.mockImplementation(async (_, address) => address === SUBJECT_ID
    ? historyResponse
    : {result: {identity: {identityaddress: SIGNER_ID, contentmultimap: {}}}});
  prepareDelta({});
});

describe('identity update content history for review', () => {
  it.each([
    ['without content changes', undefined],
    ['with accumulated content', newContent],
  ])('reviews transaction-decoded controls despite a forged RPC threshold %s', async (_, content) => {
    const decodedIdentity = Identity.fromJson({
      ...subjectIdentity.identity,
      primaryaddresses: [
        ...subjectIdentity.identity.primaryaddresses,
        'RWCqoWfSKaDoGeiwD6ZxX2dwkMx2oHJM56',
      ],
      contentmultimap: {},
    });
    const decodedJson = decodedIdentity.toJson();
    subjectIdentity.identity = {...decodedJson, minimumsignatures: 2};
    getUpdatableIdentity.mockResolvedValue({identity: decodedIdentity, tx: 'canonical-identity-hex'});
    historyResponse.result.identity = {
      ...decodedJson,
      minimumsignatures: 99,
      flags: 32768,
      contentmultimap: oldContent,
    };
    createUpdateIdentityTx.mockResolvedValue({
      identity: Identity.fromJson({...decodedJson, minimumsignatures: 2, contentmultimap: content || {}}),
      hex: 'prepared-update-hex',
    });

    const {displayProps} = await handleRequest(makeRequest(content, {minimumsignatures: 2}));

    expect(displayProps.subjectIdentityContent).toEqual({
      ...subjectIdentity,
      identity: {...decodedJson, contentmultimap: content ? oldContent : {}},
    });
    expect(displayProps.subjectIdentity.identity.minimumsignatures).toBe(1);
    expect(displayProps.identityUpdates.minimumsignatures).toBe(2);
    expect(displayProps.identityUpdates.contentmultimap).toEqual(content || {});
    expect(getUpdatableIdentity).toHaveBeenCalledWith(SYSTEM_ID, subjectIdentity);
    expect(subjectIdentity.identity.minimumsignatures).toBe(2);
    if (content) {
      expect(getIdentityContent).toHaveBeenCalledWith(SYSTEM_ID, SUBJECT_ID, 0, 42);
    } else {
      expect(getIdentityContent.mock.calls).toEqual([[SYSTEM_ID, SIGNER_ID]]);
    }
  });

  it.each([
    ['omitted content', undefined],
    ['empty content map', {}],
    ['empty value list', {[KEY]: []}],
  ])('does not fetch subject history or copy old content for %s', async (_, content) => {
    const {displayProps} = await handleRequest(makeRequest(content));

    expect(getIdentityContent.mock.calls).toEqual([[SYSTEM_ID, SIGNER_ID]]);
    expect(displayProps.identityUpdates.contentmultimap).toEqual({});
    expect(displayProps.subjectIdentity).toEqual(subjectIdentity);
  });

  it('uses aggregate content for display without changing canonical identity or the appended delta', async () => {
    subjectIdentity.identity.contentmultimap = {};
    getUpdatableIdentity.mockResolvedValue({
      identity: Identity.fromJson(subjectIdentity.identity), tx: 'canonical-identity-hex',
    });
    prepareDelta(newContent);
    const request = makeRequest(newContent);
    const originalDetails = request.getDetails().data;
    const originalBytes = originalDetails.toBuffer();
    const {displayProps} = await handleRequest(request);

    expect(getIdentityContent).toHaveBeenCalledWith(SYSTEM_ID, SUBJECT_ID, 0, 42);
    expect(getIdentityContent).toHaveBeenCalledWith(SYSTEM_ID, SIGNER_ID);
    expect(displayProps.subjectIdentityContent).toEqual({
      ...subjectIdentity,
      identity: {...subjectIdentity.identity, contentmultimap: oldContent},
    });
    expect(displayProps.identityUpdates.contentmultimap).toEqual(newContent);
    expect(subjectIdentity.identity.contentmultimap).toEqual({});
    expect(getUpdatableIdentity).toHaveBeenCalledWith(SYSTEM_ID, subjectIdentity);
    expect(createUpdateIdentityTx).toHaveBeenCalledWith(
      SYSTEM_ID, expect.any(IdentityUpdateRequestDetails), SUBJECT_ID, 'canonical-identity-hex',
      42, false, true, undefined, 100,
    );
    const passed = createUpdateIdentityTx.mock.calls[0][1];
    expect(passed).not.toBe(originalDetails);
    expect(passed.toBuffer()).toEqual(originalBytes);
    expect(originalDetails.toBuffer()).toEqual(originalBytes);
    expect(displayProps.subjectIdTxHex).toBe('canonical-identity-hex');
  });

  it('preserves the explicit remove-key operation separately from current content', async () => {
    const removal = {[ContentMultiMapRemoveKey.vdxfid]: [{
      [ContentMultiMapRemoveKey.vdxfid]: {version: 1, action: 3, entrykey: KEY},
    }]};
    prepareDelta(removal);
    const {displayProps} = await handleRequest(makeRequest(removal));

    expect(getIdentityContent).toHaveBeenCalledWith(SYSTEM_ID, SUBJECT_ID, 0, 42);
    expect(displayProps.subjectIdentity.identity.contentmultimap).toEqual(oldContent);
    expect(displayProps.identityUpdates.contentmultimap).toEqual(removal);
  });

  it.each([
    ['data signer', {address: SUBJECT_ID}],
    ['data signature', {signature: Buffer.alloc(65, 1).toString('base64')}],
    ['prefix binding', {prefixstring: 'bound prefix'}],
    ['VDXF key binding', {vdxfkeys: [KEY]}],
    ['VDXF name binding', {vdxfkeynames: ['bound key']}],
    ['hash binding', {boundhashes: ['ab'.repeat(32)]}],
    ['credential upload', {}, IDENTITY_CREDENTIAL.vdxfid],
    ['createmmr=false', {createmmr: false}],
    ['omitted createmmr', {createmmr: undefined}],
  ])('rejects an upload with %s before looking up identities or building a transaction', async (_, options, key = KEY) => {
    const request = makeRequest({[key]: {data: {
      message: 'new signed value', createmmr: true, ...options,
    }}});
    expect(request.getDetails().data.containsSignData()).toBe(true);

    const rejection = handleRequest(request);
    await expect(rejection).rejects.toMatchObject({code: 'IDENTITY_DATA_UPLOAD_UNSUPPORTED'});
    await expect(rejection.catch(getGenericRequestRejection)).resolves.toEqual({
      canRetry: false,
      message: 'This request uses an upload option that this app does not support. Ask the requester for a new request.',
      title: 'Unsupported upload',
    });
    expect(getInfo).not.toHaveBeenCalled();
    expect(getIdentity).not.toHaveBeenCalled();
    expect(getUpdatableIdentity).not.toHaveBeenCalled();
    expect(getIdentityContent).not.toHaveBeenCalled();
    expect(createUpdateIdentityTx).not.toHaveBeenCalled();
  });

  it('previews a supported upload with a detached request and disposes its wallet crypto', async () => {
    const request = makeRequest({[KEY]: {data: {message: 'upload', createmmr: true}}});
    const originalDetails = request.getDetails().data;
    const originalBytes = originalDetails.toBuffer();
    prepareDelta(newContent);

    const {displayProps} = await handleRequest(request);

    expect(createUpdateIdentityTx).toHaveBeenCalledWith(
      SYSTEM_ID, expect.any(IdentityUpdateRequestDetails), SUBJECT_ID, 'canonical-identity-hex',
      42, false, true, expect.objectContaining({
        randomBytes: expect.any(Function), encrypt: expect.any(Function),
        decryptData: expect.any(Function), dispose: expect.any(Function),
      }), 100,
    );
    const passed = createUpdateIdentityTx.mock.calls[0][1];
    expect(passed).not.toBe(originalDetails);
    expect(passed.toBuffer()).toEqual(originalBytes);
    expect(originalDetails.toBuffer()).toEqual(originalBytes);
    expect(displayProps.identityPreviewPrepared).toBe(true);
    expect(displayProps.identityUpdates.contentmultimap).toEqual(newContent);
    expect(getIdentityContent).toHaveBeenCalledWith(SYSTEM_ID, SUBJECT_ID, 0, 42);
    expect(displayProps.subjectIdentityContent.identity.contentmultimap).toEqual(oldContent);
    const crypto = createUpdateIdentityTx.mock.calls[0][7];
    await expect(crypto.randomBytes(32)).rejects.toThrow('Identity upload operation has been disposed.');
    expect(store.subscribe.mock.results[0].value).toHaveBeenCalledTimes(1);
  });

  it('propagates a subject history error instead of displaying an empty before-state', async () => {
    historyResponse = {error: {message: 'Identity history unavailable'}};

    await expect(handleRequest(makeRequest(newContent))).rejects.toThrow('Identity history unavailable');
  });

  it('rejects history belonging to another identity', async () => {
    historyResponse.result.identity.identityaddress = SIGNER_ID;

    await expect(handleRequest(makeRequest(newContent))).rejects.toThrow(
      'Identity content does not match the identity being updated',
    );
  });
});
