import VrpcProvider from "../../../../vrpc/vrpcInterface"
import { validateLookupBinding } from "./lookupBinding";

const checkLookup = (systemId, iAddressOrName, res) => {
  if (res.error) return res;
  else {
    const currencyDefinition = res.result;

    try {
      validateLookupBinding(
        systemId,
        iAddressOrName,
        currencyDefinition.currencyid,
        currencyDefinition.fullyqualifiedname,
        "currency",
      );

      return res;
    } catch(e) {
      return {
        id: 0,
        error: {
          message: e.message,
          code: -1
        }
      }
    }
  }
}

// The definition with its current state. Use it when the state matters, and on
// every path that builds, checks or prices a transaction.
export const getCurrency = async (systemId, iAddressOrName) =>
  checkLookup(
    systemId,
    iAddressOrName,
    await VrpcProvider.getEndpoint(systemId).getCurrency(iAddressOrName),
  );

// F10: the fixed fields of a currency (name, IDs, systems, flags), from a
// saved copy when there is one. It has no currency state.
export const getCurrencyDefinition = async (systemId, iAddressOrName) =>
  checkLookup(
    systemId,
    iAddressOrName,
    await VrpcProvider.getEndpoint(systemId).getCurrencyDefinition(iAddressOrName),
  );
