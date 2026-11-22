/*
  R2 option A (owner 2026-11-22): "Price and route" lists only checked routes.
  While routes remain unchecked it ends in "Check N more routes" over
  "<checked> of <total> routes checked", and the best row says "Best so far".
  Expected copy comes from the decided rule, not from the code.
*/
import React from 'react';
import {act, create} from 'react-test-renderer';
import {Text} from 'react-native';

jest.mock('../../../components/BottomSheetModal', () => props =>
  props.visible ? props.children : null,
);
jest.mock('../../../components/SheetScrollView', () => props => {
  const ReactModule = require('react');
  return ReactModule.createElement('SheetScrollView', props, props.children);
});
jest.mock('../../../components/AppButton', () => props => {
  const ReactModule = require('react');
  return ReactModule.createElement('AppButton', props, props.children);
});
jest.mock('../../../components/SelectionSheet', () => ({
  SelectionRow: props => {
    const ReactModule = require('react');
    return ReactModule.createElement('SelectionRow', props);
  },
}));
jest.mock('../../../components/StatusBadge', () => {
  const ReactModule = require('react');
  const StatusBadge = props => ReactModule.createElement('StatusBadge', props);
  return {__esModule: true, default: StatusBadge, STATUS_BADGE_TONE: {SUCCESS: 'success', NEUTRAL: 'neutral', WARNING: 'warning', DANGER: 'danger'}};
});
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'MCIcon');
jest.mock('lucide-react-native', () => ({RotateCw: 'RotateCw'}));
jest.mock('../../../hooks/useButtonHeight', () => ({useButtonHeight: () => 56}));

const PriceRouteSheet = require('../components/PriceRouteSheet').default;

const route = n => ({key: `r${n}`, via: `b${n}`, viaFqn: `Basket${n}`});
const routes = total => Array.from({length: total}, (_, index) => route(index));
// Route i gives 10 - i/100, so route 0 is the best.
const estimatesFor = (count, failed = []) => Object.fromEntries(
  Array.from({length: count}, (_, index) => [
    `r${index}`,
    failed.includes(index) ? null : {estimatedcurrencyout: 10 - index / 100},
  ]),
);

const render = ({total, checked, failed = [], checkingMore = false, onCheckMore = jest.fn()}) => {
  const target = {isConversion: true, ticker: 'EUR', routes: routes(total)};
  let view;
  act(() => {
    view = create(
      <PriceRouteSheet
        checkingMore={checkingMore}
        cryptoAmount="1"
        estimatedOutput={10}
        estimates={estimatesFor(checked, failed)}
        onCheckMore={onCheckMore}
        onClose={jest.fn()}
        onSelect={jest.fn()}
        onUseSuggestion={jest.fn()}
        priceImpact={{impact: null, level: 'none', loss: null, marketPrice: null, suggestion: null}}
        route={target.routes[0]}
        sourceCoin={{display_ticker: 'VRSC'}}
        target={target}
        visible
      />,
    );
  });
  return view;
};
const texts = view => view.root.findAllByType(Text).map(node =>
  [].concat(node.props.children).join(''));
const rows = view => view.root.findAllByType('SelectionRow');
// The badge is an element passed to the (mocked) SelectionRow.
const badge = view => rows(view)
  .map(node => node.props.badge?.props.label)
  .filter(Boolean);

describe('Price and route with many routes (R2 A)', () => {
  it('lists the 30 checked of 100 routes and ends in Check 30 more routes', () => {
    const onCheckMore = jest.fn();
    const view = render({total: 100, checked: 30, onCheckMore});
    expect(rows(view)).toHaveLength(30);
    expect(texts(view)).toEqual(expect.arrayContaining([
      'Check 30 more routes',
      '30 of 100 routes checked',
    ]));
    expect(badge(view)).toEqual(['Best so far']);
    expect(texts(view).join(' ')).not.toMatch(/Estimate unavailable/);
    const end = view.root.find(node => node.props.accessibilityLabel === 'Check 30 more routes. 30 of 100 routes checked');
    act(() => end.props.onPress());
    expect(onCheckMore).toHaveBeenCalledTimes(1);
  });

  it('says route in the singular when one is left', () => {
    const view = render({total: 31, checked: 30});
    expect(texts(view)).toEqual(expect.arrayContaining([
      'Check 1 more route',
      '30 of 31 routes checked',
    ]));
  });

  it('shows the check in progress and keeps the rows', () => {
    const view = render({total: 100, checked: 30, checkingMore: true});
    expect(rows(view)).toHaveLength(30);
    expect(texts(view)).toEqual(expect.arrayContaining([
      'Checking 30 routes…',
      '30 of 100 routes checked',
    ]));
    expect(texts(view)).not.toContain('Check 30 more routes');
  });

  it('has no end row and says Best price when every route is checked', () => {
    const view = render({total: 5, checked: 5});
    expect(rows(view)).toHaveLength(5);
    expect(badge(view)).toEqual(['Best price']);
    expect(texts(view).join(' ')).not.toMatch(/routes checked|more route/);
  });

  it('gives the badge on equal estimates to the route checked first, as Amount does', () => {
    // r2 was checked first (the oldest), r0 and r1 later; all give 10.
    const target = {isConversion: true, ticker: 'EUR', routes: routes(3)};
    const estimates = {r2: {estimatedcurrencyout: 10}, r0: {estimatedcurrencyout: 10}, r1: {estimatedcurrencyout: 10}};
    let view;
    act(() => {
      view = create(
        <PriceRouteSheet
          cryptoAmount="1"
          estimatedOutput={10}
          estimates={estimates}
          onCheckMore={jest.fn()}
          onClose={jest.fn()}
          onSelect={jest.fn()}
          onUseSuggestion={jest.fn()}
          priceImpact={{impact: null, level: 'none', loss: null, marketPrice: null, suggestion: null}}
          route={target.routes[2]}
          sourceCoin={{display_ticker: 'VRSC'}}
          target={target}
          visible
        />,
      );
    });
    const best = rows(view).find(node => node.props.badge);
    expect(best.props.title).toBe('Basket2');
  });

  it('keeps Check 30 more routes when every checked estimate failed', () => {
    // Orchestrator 2026-11-22: the row on Amount opens this sheet after a
    // failed estimate; the next 30 must be one tap away.
    const onCheckMore = jest.fn();
    const failed = Array.from({length: 30}, (_, index) => index);
    const view = render({total: 60, checked: 30, failed, onCheckMore});
    expect(rows(view)).toHaveLength(30);
    expect(texts(view)).toEqual(expect.arrayContaining([
      'Check 30 more routes',
      '30 of 60 routes checked',
    ]));
    const end = view.root.find(node => node.props.accessibilityLabel === 'Check 30 more routes. 30 of 60 routes checked');
    act(() => end.props.onPress());
    expect(onCheckMore).toHaveBeenCalledTimes(1);
  });

  it('keeps the failure text for a checked route whose estimate failed', () => {
    const view = render({total: 40, checked: 30, failed: [3]});
    const subtitles = rows(view).map(node => node.props.subtitle);
    expect(subtitles.filter(text => text === 'Estimate unavailable.')).toHaveLength(1);
    expect(subtitles[subtitles.length - 1]).toBe('Estimate unavailable.');
  });
});
