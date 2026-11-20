import {useSelector} from 'react-redux';
import {useObjectSelector} from '../../hooks/useObjectSelector';
import {USD} from '../../utils/constants/currencies';

// The display-currency price of the currency the user receives, or null.
// Only the ledger is read: it holds a price for wallet assets with a market
// price. A target without one shows no money line. This hook sends no
// request. It is never the paid asset's price and never the conversion's own
// crypto ratio.
export const useReceivedPrice = (coinId, fiatChannel) => {
  const displayCurrency = useSelector(
    stateValue => stateValue.settings.generalWalletSettings.displayCurrency || USD,
  );
  const ledgerRates = useObjectSelector(
    stateValue =>
      fiatChannel == null || coinId == null
        ? null
        : stateValue.ledger.rates?.[fiatChannel]?.[coinId],
  );
  return ledgerRates?.[displayCurrency] ?? null;
};

export default useReceivedPrice;
