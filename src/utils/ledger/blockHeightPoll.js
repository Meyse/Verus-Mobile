import {getInfo} from '../api/channels/vrpc/requests/getInfo';

// PR 266 review F3 (lead developer, 2026-11-20): the coin screen asks the
// selected card's system for its block height once a minute. Balance and
// history are read only when the height went up. A shown pending transaction
// keeps its history read on every tick (getaddressmempool behaviour unchanged).
// After 5 ticks the poll stops at the first tick without a pending
// transaction. The screen then behaves as upstream until the card's data
// changes again.
export const BLOCK_HEIGHT_POLL_INTERVAL = 60000;
export const BLOCK_HEIGHT_POLL_IDLE_TICKS = 5;

// Height seen by the last history read of each channel. The poll compares the
// new height with it, so a block that arrived after the screen's own read is
// not missed on the first tick. Memory only.
const observedHeights = new Map();

export const noteObservedHeight = (channelId, height) => {
  if (channelId && Number.isSafeInteger(height)) observedHeights.set(channelId, height);
};

export const clearObservedHeights = () => observedHeights.clear();

/**
 * One poll per coin screen. The screen supplies its own checks:
 * - canTick(): screen focused and app in the foreground.
 * - isBusy(): a balance or history update for the card is running.
 * - hasPending(): the card shows a pending transaction.
 * - needsHistory(): the card has no resolved history yet.
 * - update({balance, history}): reads the selected card only.
 */
export const createBlockHeightPoll = ({
  channelId,
  systemId,
  canTick,
  isBusy,
  hasPending,
  needsHistory = () => false,
  update,
}) => {
  let timer = null;
  let idle = false;
  let stopped = false;
  let ticks = 0;
  let ticking = false;

  const pause = () => {
    clearInterval(timer);
    timer = null;
  };

  const tick = async () => {
    if (!canTick()) return pause();
    if (ticking || isBusy()) return;
    ticking = true;
    try {
      let height = null;
      try {
        const res = await getInfo(systemId);
        height = Number(res?.result?.longestchain);
      } catch (error) {
        // An unreachable server ends this tick. The next tick asks again.
      }
      if (stopped || !Number.isSafeInteger(height)) return;

      const known = observedHeights.get(channelId);
      const heightRose = known != null && height > known;
      // Only a successful history read moves the height on, so a failed or
      // skipped read is tried again on the next tick.
      if (known == null) observedHeights.set(channelId, height);

      if (heightRose) {
        await update({balance: true, history: true});
      } else if (hasPending() || needsHistory()) {
        await update({balance: false, history: true});
      }
    } catch (error) {
      console.warn('Block height poll update failed');
    } finally {
      ticking = false;
      // 5 minutes of ticks, then stop at the first tick without a pending
      // row. A failed tick counts too, so an unreachable server ends the poll.
      ticks += 1;
      if (!stopped && ticks >= BLOCK_HEIGHT_POLL_IDLE_TICKS && !hasPending()) {
        idle = true;
        pause();
      }
    }
  };

  // Start or continue the timer when the screen can show its data.
  const resume = () => {
    if (stopped || idle || timer != null || !canTick()) return;
    timer = setInterval(tick, BLOCK_HEIGHT_POLL_INTERVAL);
  };

  return {
    resume,
    pause,
    // New balance or history content: the 5 minutes start again.
    noteDataChange: () => {
      // A change that a tick's own read brings is counted from after it.
      ticks = ticking ? -1 : 0;
      idle = false;
      resume();
    },
    stop: () => {
      stopped = true;
      pause();
    },
    isRunning: () => timer != null,
  };
};
