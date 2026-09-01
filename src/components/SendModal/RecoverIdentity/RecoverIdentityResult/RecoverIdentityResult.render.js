import React from 'react';
import RevokeRecoverSubmittedResult from '../../../../containers/RevokeRecover/RevokeRecoverSubmittedResult';
import {explorers} from '../../../../utils/CoinData/CoinData';
import {convertFqnToDisplayFormat} from '../../../../utils/fullyqualifiedname';

export const RecoverIdentityResultRender = ({
  finishSend,
  networkObj,
  openExplorer,
  targetId,
  txid,
}) => (
  <RevokeRecoverSubmittedResult
    action="recovery"
    identityName={convertFqnToDisplayFormat(targetId.fullyqualifiedname)}
    networkName={networkObj?.display_name || 'the selected blockchain'}
    onDone={finishSend}
    onViewTransaction={
      networkObj && explorers[networkObj.id] ? openExplorer : null
    }
    txid={txid}
  />
);
