import {
  registrationCanStillConfirm,
  registrationCommitmentFee,
  registrationDeletionKind,
  registrationExpiryHeight,
} from '../../identityRegistration/deletion';

const commitment = {signedHex: 'signed-commitment', txid: 'commitment-txid'};
const registration = {signedHex: 'signed-registration', txid: 'registration-txid'};

describe('registration deletion classification', () => {
  it('distinguishes an unpaid draft from a saved commitment, including an archived commitment', () => {
    expect(registrationDeletionKind({status: 'commitment_prepared', commitment: {prepared: {}}})).toBe('draft');
    expect(registrationDeletionKind({status: 'commitment_confirmed', commitment})).toBe('commitment');
    expect(registrationDeletionKind({status: 'registration_prepared', commitment, registration: {prepared: {}}})).toBe('commitment');
    expect(registrationDeletionKind({status: 'commitment_prepared', commitment: {prepared: {}}, previousCommitments: [commitment]})).toBe('commitment');
  });

  // PR 266 review R7 option 2: a signed second payment can be deleted, with a
  // warning while it can still confirm.
  it.each([
    ['registration_signed', true],
    ['registration_broadcast', true],
    ['registration_broadcast_unknown', true],
    ['registration_expired', false],
  ])('classifies a signed registration in state %s as deletable', (status, canConfirm) => {
    const job = {status, commitment, registration: {...registration, prepared: {snapshot: {expiryHeight: 1284536}}}};
    expect(registrationDeletionKind(job)).toBe('registration');
    expect(registrationCanStillConfirm(job)).toBe(canConfirm);
    expect(registrationExpiryHeight(job)).toBe(canConfirm ? 1284536 : undefined);
  });

  it('classifies archived and unexplained reveals as signed registrations', () => {
    const archived = {status: 'registration_prepared', commitment,
      registration: {prepared: {}}, previousRegistrations: [registration]};
    expect(registrationDeletionKind(archived)).toBe('registration');
    // Archived reveals expired before the engine replaced them.
    expect(registrationCanStillConfirm(archived)).toBe(false);
    const unexplained = {status: 'registration_prepared', commitment, registration: {txid: 'possibly-sent'}};
    expect(registrationDeletionKind(unexplained)).toBe('registration');
    expect(registrationCanStillConfirm(unexplained)).toBe(true);
    expect(registrationExpiryHeight(unexplained)).toBeUndefined();
    expect(registrationDeletionKind({status: 'registration_broadcast_unknown', commitment})).toBe('registration');
  });

  it.each(['registered', 'complete'])('allows confirmed %s receipts while keeping signed history intact until deletion', status => {
    const job = {status, commitment, registration: {...registration, height: 12, blockHash: 'a'.repeat(64)}, previousRegistrations: [registration]};
    expect(registrationDeletionKind(job)).toBe('completed');
    expect(registrationDeletionKind({...job, registration: {...job.registration, height: 0}})).toBeNull();
    expect(registrationDeletionKind({...job, registration: {...job.registration, blockHash: undefined}})).toBeNull();
    expect(registrationDeletionKind({...job, registration: {...job.registration, signedHex: undefined}})).toBeNull();
    expect(registrationDeletionKind({...job, commitment: undefined})).toBeNull();
    expect(registrationDeletionKind({...job, commitment: {txid: commitment.txid}})).toBeNull();
    expect(registrationDeletionKind({...job, commitment: {signedHex: commitment.signedHex}})).toBeNull();
    expect(registrationDeletionKind({...job, status: 'registration_broadcast'})).toBe('registration');
    expect(registrationCanStillConfirm(job)).toBe(false);
  });

  it('fails closed on invalid receipt histories or missing records', () => {
    expect(registrationDeletionKind(null)).toBeNull();
    expect(registrationDeletionKind({status: 'commitment_prepared', previousRegistrations: {signedHex: 'hidden'}})).toBeNull();
    expect(registrationDeletionKind({status: 'commitment_prepared', previousCommitments: {signedHex: 'hidden'}})).toBeNull();
  });

  it('uses the latest signed commitment fee when a replacement is still unsigned', () => {
    const previousCommitments = [
      {...commitment, prepared: {quote: {commitmentFee: '10000'}}},
      {...commitment, prepared: {quote: {commitmentFee: '20000'}}},
    ];
    const current = {prepared: {quote: {commitmentFee: '30000'}}};
    expect(registrationCommitmentFee({commitment: current, previousCommitments})).toBe('20000');
    expect(registrationCommitmentFee({commitment: {...commitment, ...current}, previousCommitments})).toBe('30000');
    expect(registrationCommitmentFee({commitment: current})).toBe('30000');
    expect(registrationCommitmentFee({commitment: {prepared: {quote: {commitmentFee: 'private-data'}}}})).toBeUndefined();
  });
});
