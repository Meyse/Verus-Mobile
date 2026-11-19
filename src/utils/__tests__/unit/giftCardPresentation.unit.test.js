const {
  GIFT_CARD_DISPLAY_STATUS_NOT_FUNDED,
  GIFT_CARD_DISPLAY_STATUS_PENDING,
  GIFT_CARD_DISPLAY_STATUS_READY,
  GIFT_CARD_DISPLAY_STATUS_REDEEMED,
  GIFT_CARD_DISPLAY_STATUS_SHARED,
  getGiftCardIncludedRows,
  getGiftCardPresentation,
} = require('../../giftCard/giftCardPresentation');

const currency = (currencyId, amount, name = currencyId) => ({
  amount,
  currencyId,
  display: {name},
});

const identity = (identityAddress, fullyQualifiedName) => ({
  identityAddress,
  fullyQualifiedName,
});

const buildCard = overrides => ({
  id: 'gift-card-1',
  label: 'Summer trip',
  encrypted: false,
  fundingHistory: [],
  status: {
    state: 'funded',
    systems: [],
  },
  ...overrides,
});

describe('gift card presentation', () => {
  it('summarizes mixed confirmed currencies and VerusIDs without flattening their meaning', () => {
    const card = buildCard({
      encrypted: true,
      status: {
        state: 'funded',
        systems: [
          {
            systemId: 'VRSC',
            currencies: [
              currency('VRSC', '12.5'),
              currency('Bridge.vETH', '0.04'),
            ],
            identities: [identity('i-address', 'traveler@')],
          },
        ],
      },
    });

    const presentation = getGiftCardPresentation(card);

    expect(presentation.status).toBe(GIFT_CARD_DISPLAY_STATUS_READY);
    expect(presentation.primaryContent).toEqual({
      type: 'currency',
      value: '12.5',
      label: 'VRSC',
      currencyId: 'VRSC',
    });
    expect(presentation.confirmedItemCount).toBe(3);
    expect(presentation.additionalConfirmedCount).toBe(2);
    expect(presentation.protectionLabel).toBe('Claim password required');
  });

  it('uses a VerusID as the primary content for identity-only cards', () => {
    const presentation = getGiftCardPresentation(
      buildCard({
        status: {
          state: 'funded',
          systems: [
            {
              systemId: 'VRSC',
              currencies: [],
              identities: [identity('i-address', 'summer.traveler@')],
            },
          ],
        },
      }),
    );

    expect(presentation.primaryContent).toEqual({
      type: 'identity',
      value: 'summer.traveler@',
      label: 'VerusID',
    });
    expect(presentation.additionalConfirmedCount).toBe(0);
  });

  it('keeps pending funding separate from confirmed contents', () => {
    const presentation = getGiftCardPresentation(
      buildCard({
        fundingHistory: [
          {
            status: 'pending',
            txids: ['transaction-id'],
          },
        ],
        status: {
          state: 'funded',
          systems: [
            {
              systemId: 'VRSC',
              currencies: [currency('VRSC', '4')],
              identities: [],
            },
          ],
        },
      }),
    );

    expect(presentation.status).toBe(GIFT_CARD_DISPLAY_STATUS_PENDING);
    expect(presentation.primaryContent.value).toBe('4');
    expect(presentation.confirmedItemCount).toBe(1);
    expect(presentation.hasPending).toBe(true);
    expect(presentation.pendingCount).toBe(1);
  });

  it('distinguishes not-funded, shared, and claimed cards', () => {
    const notFunded = getGiftCardPresentation(
      buildCard({
        status: {state: 'new', systems: []},
      }),
    );
    const shared = getGiftCardPresentation(
      buildCard({
        sharedAt: 1760000000000,
        status: {
          state: 'funded',
          systems: [
            {
              systemId: 'VRSC',
              currencies: [currency('VRSC', '4')],
              identities: [],
            },
          ],
        },
      }),
    );
    const sharedPending = getGiftCardPresentation(
      buildCard({
        sharedAt: 1760000000000,
        fundingHistory: [{status: 'pending', txids: ['transaction-id']}],
        status: {state: 'new', systems: []},
      }),
    );
    const redeemed = getGiftCardPresentation(
      buildCard({
        sharedAt: 1760000000000,
        fundingHistory: [{status: 'pending', txids: ['transaction-id']}],
        status: {state: 'redeemed', redeemed: true, systems: []},
      }),
    );

    expect(notFunded.status).toBe(GIFT_CARD_DISPLAY_STATUS_NOT_FUNDED);
    expect(notFunded.primaryContent.value).toBe('No contents yet');
    expect(shared.status).toBe(GIFT_CARD_DISPLAY_STATUS_SHARED);
    expect(shared.statusLabel).toBe('Shared');
    expect(sharedPending.status).toBe(GIFT_CARD_DISPLAY_STATUS_PENDING);
    expect(redeemed.status).toBe(GIFT_CARD_DISPLAY_STATUS_REDEEMED);
    expect(redeemed.statusLabel).toBe('Claimed');
    expect(redeemed.primaryContent).toEqual({
      type: 'redeemed',
      value: 'Empty',
      label: null,
    });
    expect(redeemed.confirmedItemCount).toBe(0);
    expect(redeemed.hasPending).toBe(false);
    expect(redeemed.pendingCount).toBe(0);
  });

  it('preserves long labels, many contents, and stable material selection', () => {
    const card = buildCard({
      id: 'stable-material-card',
      label:
        'A very long summer trip gift card name that the interface will truncate',
      addressesBySystem: {
        VRSC: 'R-address',
        ETH: '0x-address',
      },
      status: {
        state: 'funded',
        systems: [
          {
            systemId: 'VRSC',
            currencies: Array.from({length: 4}, (_, index) =>
              currency(`asset-${index}`, String(index + 1)),
            ),
            identities: [],
          },
          {
            systemId: 'ETH',
            currencies: Array.from({length: 3}, (_, index) =>
              currency(`bridge-asset-${index}`, String(index + 1)),
            ),
            identities: [identity('i-address', 'traveler@')],
          },
        ],
      },
    });

    const first = getGiftCardPresentation(card);
    const second = getGiftCardPresentation({...card});

    expect(first.label).toBe(card.label);
    expect(first.confirmedItemCount).toBe(8);
    expect(first.additionalConfirmedCount).toBe(7);
    expect(first.material).toEqual(second.material);
  });

  // PR 266 review, gift card option B (owner, 2026-11-19): the card counts the
  // other items ("+ N more"); "Also included" lists them with pending marks.
  describe('also included', () => {
    const card = (currencies, identities = [], fundingHistory = []) =>
      buildCard({
        fundingHistory,
        status: {
          state: 'funded',
          systems: [{systemId: 'VRSCTEST', currencies, identities}],
        },
      });

    it('lists every item after the first, a pending one last', () => {
      const presentation = getGiftCardPresentation(
        card(
          [currency('iVRSCTEST', '25', 'VRSCTEST'), currency('iUSD', '12.5', 'USD')],
          [identity('iSam', 'sam@')],
          [
            {
              status: 'pending',
              transactions: [
                {
                  systemId: 'VRSCTEST',
                  outputs: [{currencyId: 'iVRSCTEST', amount: '1'}],
                },
              ],
            },
          ],
        ),
        {activeCoinsForUser: []},
      );

      expect(getGiftCardIncludedRows(presentation)).toEqual([
        {type: 'currency', value: '12.5', label: 'USD', currencyId: 'iUSD', pending: false},
        {type: 'identity', value: 'sam@', label: 'VerusID', pending: false},
        {type: 'currency', value: '1', label: 'VRSCTEST', currencyId: 'iVRSCTEST', pending: true},
      ]);
    });

    it('lists 5 more for a card with 6 items', () => {
      const presentation = getGiftCardPresentation(
        card(
          ['A', 'B', 'C', 'D'].map((name, index) => currency(`i${name}`, String(index + 1), name)),
          [identity('iSam', 'sam@'), identity('iLea', 'lea@')],
        ),
      );

      expect(getGiftCardIncludedRows(presentation)).toHaveLength(5);
    });

    it('lists nothing for one item, an empty card or a claimed card', () => {
      const one = getGiftCardPresentation(card([currency('iA', '1', 'A')]));
      const empty = getGiftCardPresentation(
        buildCard({status: {state: 'empty', systems: []}}),
      );
      const claimed = getGiftCardPresentation(
        buildCard({
          status: {
            state: 'redeemed',
            systems: [{systemId: 'VRSC', currencies: [currency('iA', '1', 'A'), currency('iB', '2', 'B')]}],
          },
        }),
      );

      expect(getGiftCardIncludedRows(one)).toEqual([]);
      expect(getGiftCardIncludedRows(empty)).toEqual([]);
      expect(getGiftCardIncludedRows(claimed)).toEqual([]);
    });
  });
});
