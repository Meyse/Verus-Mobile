export const BLOCKED_ADDRESS_MESSAGE = 'Sending to this address is blocked.';

export const addressIsBlocked = (address, blockList) => {
  const value = String(address || '').trim().toLowerCase();
  if (!value) return false;

  for (const blockedAddress of blockList || []) {
    if (String(blockedAddress?.address || '').toLowerCase() === value) {
      return true;
    }
  }

  return false;
}
