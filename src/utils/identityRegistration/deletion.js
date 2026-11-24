const hasSignedReceipt = receipt => !!(receipt?.signedHex || receipt?.txid);
const registrationDeliveryStates = new Set([
  'registration_signed', 'registration_broadcast', 'registration_broadcast_unknown',
]);

// Expired replacements can have an unsigned current transaction. The warning
// must describe the signed commitment being abandoned, not its new estimate.
export const registrationCommitmentFee = job => {
  const history = Array.isArray(job?.previousCommitments) ? job.previousCommitments : [];
  const receipt = hasSignedReceipt(job?.commitment) ? job.commitment :
    [...history].reverse().find(hasSignedReceipt) || job?.commitment;
  const amount = receipt?.prepared?.quote?.commitmentFee;
  return typeof amount === 'string' && /^\d+$/.test(amount) ? amount : undefined;
};

// True while the current signed second payment can still confirm on chain.
// An expired reveal cannot confirm: the engine replaces it only after its
// expiry height. Archived reveals in previousRegistrations all expired.
export const registrationCanStillConfirm = job => {
  if (!job || ['registered', 'complete', 'registration_expired'].includes(job.status)) return false;
  return registrationDeliveryStates.has(job.status) || hasSignedReceipt(job.registration);
};

// The last block in which the current signed second payment can confirm.
export const registrationExpiryHeight = job => {
  const height = job?.registration?.prepared?.snapshot?.expiryHeight;
  return registrationCanStillConfirm(job) && Number.isSafeInteger(height) && height > 0 ? height : undefined;
};

// This describes the saved receipt, not current chain evidence. Before deleting
// a completed registration, the caller must verify its confirmation again.
// Public reviews and summaries expose only the returned classification.
//
// 'registration' (PR 266 review R7, option 2): a signed second payment can be
// deleted too. The user is warned that it can still confirm. If it confirms,
// the VerusID exists on chain under the wallet's address and Link VerusID adds
// it; if it expires, its inputs were never spent.
export const registrationDeletionKind = job => {
  if (!job || (job.previousCommitments != null && !Array.isArray(job.previousCommitments)) ||
    (job.previousRegistrations != null && !Array.isArray(job.previousRegistrations))) return null;

  const completed = ['registered', 'complete'].includes(job.status);
  const registration = job.registration;
  if (completed) {
    return job.commitment?.signedHex && job.commitment.txid &&
      registration?.signedHex && registration.txid &&
      Number.isSafeInteger(registration.height) && registration.height > 0 &&
      typeof registration.blockHash === 'string' && /^[0-9a-f]{64}$/i.test(registration.blockHash)
      ? 'completed' : null;
  }

  if (registrationDeliveryStates.has(job.status) ||
    [registration, ...(job.previousRegistrations || [])].some(hasSignedReceipt)) return 'registration';

  return [job.commitment, ...(job.previousCommitments || [])].some(hasSignedReceipt)
    ? 'commitment' : 'draft';
};
