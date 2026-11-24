import { GetInfoRequest } from "verus-typescript-primitives";
import VrpcProvider from "../../../../vrpc/vrpcInterface"

// The current block height. Every caller that builds, checks or prices a
// transaction, or that decides whether something has expired, uses this one.
export const getInfo = (systemId) => {
  return VrpcProvider.getEndpoint(systemId).getInfo();
}

// F10: a block height for display only (a countdown, a badge). It can be up
// to one minute old: the same age as the coin screen's block height poll.
export const DISPLAY_INFO_MAX_AGE_MS = 60 * 1000;

export const getDisplayInfo = (systemId) => {
  return VrpcProvider.getEndpoint(systemId).requestWithMaxAge(
    new GetInfoRequest(systemId),
    DISPLAY_INFO_MAX_AGE_MS,
  );
}
