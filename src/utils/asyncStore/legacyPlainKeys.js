import AsyncStorage from '@react-native-async-storage/async-storage';

// Delete-only cleanup of plain AsyncStorage keys that older redesign builds
// wrote with identifying data: found-asset balances and addresses, the coin
// list in the price cache keys, and txids of paid invoices. The data now lives
// in memory or in encrypted storage. Nothing is read or copied. Remove this
// after one release.
const LEGACY_PLAIN_KEYS = ['portfolioMarketHistory:v1', 'paid_invoice_markers'];
const LEGACY_PLAIN_KEY_PREFIXES = ['assetDiscoveryCache:v1:'];

export const isLegacyPlainKey = key =>
  LEGACY_PLAIN_KEYS.includes(key) ||
  LEGACY_PLAIN_KEY_PREFIXES.some(prefix => key.startsWith(prefix));

export const removeLegacyPlainKeys = async () => {
  try {
    const keys = (await AsyncStorage.getAllKeys()).filter(isLegacyPlainKey);
    if (keys.length > 0) await AsyncStorage.multiRemove(keys);
    return keys;
  } catch (error) {
    // The app works without this cleanup. The next start tries again.
    console.warn('Could not remove old plain storage keys.', error.message);
    return [];
  }
};
