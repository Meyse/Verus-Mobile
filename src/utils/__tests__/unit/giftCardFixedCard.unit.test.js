// PR 266 review, gift card option B (owner, 2026-11-19): the card shows its
// first item large and counts the others ("+ N more").
import React from 'react';
import {act, create} from 'react-test-renderer';

jest.mock('react-native-svg', () => ({
  __esModule: true,
  default: 'Svg',
  Path: 'Path',
}));

const GiftCardFixedCard =
  require('../../../containers/Services/ServiceComponents/GiftCardService/GiftCardFixedCard').default;
const {getGiftCardPresentation} = require('../../giftCard/giftCardPresentation');

const currency = (currencyId, amount, name) => ({
  amount,
  currencyId,
  display: {name},
});

const presentationWith = (currencies, identities = []) =>
  getGiftCardPresentation({
    id: 'gift-card-1',
    label: 'Summer trip',
    fundingHistory: [],
    status: {
      state: 'funded',
      systems: [{systemId: 'VRSCTEST', currencies, identities}],
    },
  });

const texts = renderer =>
  renderer.root
    .findAll(node => node.type === 'Text')
    .map(node => [].concat(node.props.children).join(''));

const render = presentation => {
  let renderer;
  act(() => {
    renderer = create(<GiftCardFixedCard presentation={presentation} />);
  });
  return renderer;
};

describe('gift card contents line', () => {
  it('counts the other items of a card with 3 items', () => {
    const renderer = render(
      presentationWith(
        [currency('iV', '25', 'VRSCTEST'), currency('iU', '12.5', 'USD')],
        [{identityAddress: 'iSam', fullyQualifiedName: 'sam@'}],
      ),
    );

    expect(texts(renderer)).toContain('+ 2 more');
    expect(texts(renderer).some(text => text.includes('sam@'))).toBe(false);
    renderer.unmount();
  });

  it('shows no count for a card with 1 item', () => {
    const renderer = render(presentationWith([currency('iV', '25', 'VRSCTEST')]));

    expect(texts(renderer).some(text => text.includes('more'))).toBe(false);
    renderer.unmount();
  });
});
