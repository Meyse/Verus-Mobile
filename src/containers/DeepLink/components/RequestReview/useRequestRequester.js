import {useCallback, useEffect, useState} from 'react';
import {CoinDirectory} from '../../../../utils/CoinData/CoinDirectory';
import {getFriendlyNameMap, getIdentity} from '../../../../utils/api/channels/verusid/callCreators';
import {convertFqnToDisplayFormat} from '../../../../utils/fullyqualifiedname';

// Review screens receive the envelope only after validateGenericRequest has
// verified its signature. A legacy VerusPay invoice has no envelope; DeepLink
// verifies its signature and the caller passes signatureVerified. This hook
// reads those results; it does not verify a signature.
export default function useRequestRequester({
  request,
  signatureVerified,
  signerFqn,
  signerIdentityID,
  signerSystemID
}) {
  const envelopeSigned = request?.isSigned?.() === true;
  const verified = envelopeSigned || signatureVerified === true;
  const address = signerIdentityID || (envelopeSigned ? request.signature.identityID.toIAddress() : null);
  const systemId = signerSystemID || (envelopeSigned ? request.signature.systemID.toIAddress() : null);
  const [resolvedName, setResolvedName] = useState(null);
  const loadVerusId = useCallback(async () => {
    if (!address || !systemId) return null;
    const result = await getIdentity(systemId, address);
    if (result.error) throw new Error('Unable to load VerusID');
    return result.result;
  }, [address, systemId]);
  const loadFriendlyNames = useCallback(async identity => {
    if (!identity) return {};
    const coin = CoinDirectory.getBasicCoinObj(systemId);
    return getFriendlyNameMap(coin.system_id, identity);
  }, [systemId]);
  useEffect(() => {
    let active = true;
    setResolvedName(null);
    if (verified && !signerFqn) {
      loadVerusId().then(identity => {
        if (active && identity?.fullyqualifiedname) {
          setResolvedName(convertFqnToDisplayFormat(identity.fullyqualifiedname));
        }
      }).catch(() => {});
    }
    return () => {
      active = false;
    };
  }, [loadVerusId, signerFqn, verified]);
  return {
    verified,
    address,
    systemId,
    name: signerFqn || resolvedName || address,
    loadVerusId,
    loadFriendlyNames
  };
}
