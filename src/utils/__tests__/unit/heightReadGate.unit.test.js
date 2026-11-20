import {createHeightReadGate} from '../../ledger/heightReadGate';
import {noteOwnBroadcast, ownBroadcastEpoch} from '../../ledger/ownBroadcasts';

// PR 266 review F14: VerusID screens read again only after a new block or the
// user's own transaction on that system.
describe('height read gate', () => {
  it('reads once per block and again after the height rose', () => {
    const gate = createHeightReadGate();
    expect(gate.isDue('id', 'iSys', 500)).toBe(true);
    gate.note('id', 'iSys', 500, ownBroadcastEpoch('iSys'));

    const reads = [500, 500, 500, 500, 500, 501, 501].filter(height => {
      if (!gate.isDue('id', 'iSys', height)) return false;
      gate.note('id', 'iSys', height, ownBroadcastEpoch('iSys'));
      return true;
    });

    expect(reads).toEqual([501]);
  });

  it('reads again in the same block after an own broadcast on that system only', () => {
    const gate = createHeightReadGate();
    gate.note('a', 'iSysA', 500, ownBroadcastEpoch('iSysA'));
    gate.note('b', 'iSysB', 500, ownBroadcastEpoch('iSysB'));

    noteOwnBroadcast('iSysA');

    expect(gate.isDue('a', 'iSysA', 500)).toBe(true);
    expect(gate.isDue('b', 'iSysB', 500)).toBe(false);
  });

  it('does not count a read during which an own broadcast happened', () => {
    const gate = createHeightReadGate();
    const epochBeforeRead = ownBroadcastEpoch('iSysC');
    noteOwnBroadcast('iSysC');
    gate.note('id', 'iSysC', 500, epochBeforeRead);

    expect(gate.isDue('id', 'iSysC', 500)).toBe(true);
  });

  it('reads only what it never read when the height is unknown', () => {
    const gate = createHeightReadGate();
    expect(gate.isDue('id', 'iSys', null)).toBe(true);
    gate.note('id', 'iSys', null, ownBroadcastEpoch('iSys'));

    expect(gate.isDue('id', 'iSys', null)).toBe(false);
    // The first known height after an unknown one reads again.
    expect(gate.isDue('id', 'iSys', 500)).toBe(true);
  });
});
