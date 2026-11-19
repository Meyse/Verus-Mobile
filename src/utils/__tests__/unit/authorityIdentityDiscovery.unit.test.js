/*
  IS-4 (lead-developer review 2026-11-18): when the index lists two targets
  and one identity lookup fails, discovery must say that its list is
  incomplete. A READY result would hide retry and manual entry, and a single
  READY target is selected automatically.

  Only the three request modules (the network boundary) are mocked.
*/
const mockGetIdentitiesWithAddress = jest.fn();
const mockGetIdentity = jest.fn();
const mockGetIdentitiesWithRecovery = jest.fn();
const mockGetIdentitiesWithRevocation = jest.fn();

jest.mock('../../api/channels/verusid/requests/getIdentitiesWithAddress', () => ({
  getIdentitiesWithAddress: (...args) => mockGetIdentitiesWithAddress(...args),
}));
jest.mock('../../api/channels/verusid/requests/getIdentity', () => ({
  getIdentity: (...args) => mockGetIdentity(...args),
}));
jest.mock('../../api/channels/verusid/requests/getIdentitiesWithAuthority', () => ({
  getIdentitiesWithRecovery: (...args) => mockGetIdentitiesWithRecovery(...args),
  getIdentitiesWithRevocation: (...args) => mockGetIdentitiesWithRevocation(...args),
}));

const {
  AUTHORITY_IDENTITY_DISCOVERY_STATUS,
  discoverAuthorityIdentityTargets,
} = require('../../api/channels/verusid/authorityIdentityDiscovery');

const SYSTEM = 'iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq';
const R_AUTH = 'RAuthorityPrimaryAddress1111111111';
const I_AUTH = 'iAuthority111111111111111111111111';
const I_ALPHA = 'iAlpha11111111111111111111111111111';
const I_BETA = 'iBeta111111111111111111111111111111';
const REVOKED = 0x8000;

const authority = {
  identityaddress: I_AUTH,
  primaryaddresses: [R_AUTH],
  minimumsignatures: 1,
  flags: 0,
  revocationauthority: I_AUTH,
  recoveryauthority: I_AUTH,
};
const target = (address, name, flags) => ({
  identity: {
    identityaddress: address,
    name,
    flags,
    primaryaddresses: ['ROtherOwner111111111111111111111111'],
    minimumsignatures: 1,
    revocationauthority: I_AUTH,
    recoveryauthority: I_AUTH,
  },
  fullyqualifiedname: `${name}.VRSCTEST@`,
});
const failure = {error: {code: -1, message: 'network timeout'}};

// `failing` lists the i-addresses whose getIdentity call fails.
const setup = (flags, failing) => {
  mockGetIdentitiesWithAddress.mockResolvedValue({result: [{identity: authority}]});
  const list = {
    result: [target(I_ALPHA, 'alpha', flags), target(I_BETA, 'beta', flags)],
  };
  mockGetIdentitiesWithRevocation.mockResolvedValue(list);
  mockGetIdentitiesWithRecovery.mockResolvedValue(list);
  mockGetIdentity.mockImplementation(async (_system, address) => {
    if (failing.includes(address)) return failure;
    return {result: target(address, address === I_ALPHA ? 'alpha' : 'beta', flags)};
  });
};

const discover = isRecovery =>
  discoverAuthorityIdentityTargets({
    isRecovery,
    primaryAddress: R_AUTH,
    systemId: SYSTEM,
  });

beforeEach(() => jest.clearAllMocks());

describe.each([
  ['revoke', false, 0],
  ['recover', true, REVOKED],
])('%s mode', (_mode, isRecovery, flags) => {
  it('returns PARTIAL with the hydrated target when one of two lookups fails', async () => {
    setup(flags, [I_BETA]);

    const result = await discover(isRecovery);

    expect(mockGetIdentity).toHaveBeenCalledTimes(2);
    expect(result.status).toBe('partial');
    expect(result.status).toBe(AUTHORITY_IDENTITY_DISCOVERY_STATUS.PARTIAL);
    expect(result.candidates.map(item => item.identityAddress)).toEqual([I_ALPHA]);
    expect(result.candidates[0].displayName).toBe('alpha@');
  });

  it('returns READY when every lookup succeeds', async () => {
    setup(flags, []);

    const result = await discover(isRecovery);

    expect(result.status).toBe('ready');
    expect(result.candidates.map(item => item.identityAddress)).toEqual([
      I_ALPHA,
      I_BETA,
    ]);
  });

  it('returns ERROR when every lookup fails', async () => {
    setup(flags, [I_ALPHA, I_BETA]);

    const result = await discover(isRecovery);

    expect(result).toEqual({candidates: [], status: 'error'});
  });
});
