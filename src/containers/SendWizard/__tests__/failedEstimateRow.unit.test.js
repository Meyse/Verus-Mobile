/*
  Orchestrator decision 2026-11-22: with 2 or more routes, a failed estimate
  keeps the "Est. slippage" row on Amount as "Details" (chevron, opens "Price
  and route"). The "via <basket>" line shows only for the route the user
  picked. Expected values come from that rule, not from the code.
*/
import React from 'react';
import {act, create} from 'react-test-renderer';
import {Text} from 'react-native';

jest.mock('../../../components/StatusBadge', () => {
  const ReactModule = require('react');
  const StatusBadge = props => ReactModule.createElement('StatusBadge', props);
  return {__esModule: true, default: StatusBadge, STATUS_BADGE_TONE: {SUCCESS: 'success', NEUTRAL: 'neutral', WARNING: 'warning', DANGER: 'danger'}};
});
jest.mock('../../../utils/CoinData/Graphics', () => ({AssetCoinLogo: 'AssetCoinLogo'}));
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'MCIcon');

const AmountEstimate = require('../components/AmountEstimate').default;
const {getFailedEstimateRow} = require('../wizardUtils');

const target = {coinId: 'EUR', name: 'EUR', ticker: 'EUR'};

const render = props => {
  let view;
  act(() => {
    view = create(
      <AmountEstimate
        estimateLoading={false}
        estimatedOutput={null}
        onOpenDetails={jest.fn()}
        priceImpact={{impact: null, level: 'none'}}
        showDetails
        target={target}
        {...props}
      />,
    );
  });
  return view;
};
const texts = view => view.root.findAllByType(Text)
  .map(node => [].concat(node.props.children).join(''));
const row = view => view.root.findAll(node =>
  typeof node.props.accessibilityLabel === 'string' &&
  node.props.accessibilityLabel.startsWith('Estimated slippage') &&
  typeof node.props.onPress === 'function');

describe('Est. slippage row after a failed estimate', () => {
  it('shows "Details" without a via line and opens Price and route', () => {
    const onOpenDetails = jest.fn();
    const view = render({estimateFailed: true, onOpenDetails});
    expect(texts(view)).toContain('Est. slippage');
    expect(texts(view)).not.toContain('via ');
    expect(view.root.findByType('StatusBadge').props.label).toBe('Details');
    expect(view.root.findByType('StatusBadge').props.tone).toBe('neutral');
    const [pressable] = row(view);
    expect(pressable.props.accessibilityLabel)
      .toBe('Estimated slippage Details. Opens price and route');
    act(() => pressable.props.onPress());
    expect(onOpenDetails).toHaveBeenCalledTimes(1);
  });

  it('shows the picked basket under the label and in the label read out', () => {
    const view = render({estimateFailed: true, via: 'Bridge.vETH'});
    expect(texts(view)).toEqual(expect.arrayContaining(['Est. slippage', 'via ', 'Bridge.vETH']));
    expect(view.root.findByType('StatusBadge').props.label).toBe('Details');
    expect(row(view)[0].props.accessibilityLabel)
      .toBe('Estimated slippage Details, via Bridge.vETH. Opens price and route');
  });

  it('reads "Details" even when an old impact is still known', () => {
    const view = render({
      estimateFailed: true,
      priceImpact: {impact: {toNumber: () => 5}, level: 'danger'},
    });
    expect(view.root.findByType('StatusBadge').props.label).toBe('Details');
    expect(view.root.findByType('StatusBadge').props.tone).toBe('neutral');
  });

  it('shows no row for a failed estimate without a choice of routes', () => {
    const view = render({estimateFailed: false});
    expect(texts(view)).not.toContain('Est. slippage');
    expect(view.root.findAllByType('StatusBadge')).toHaveLength(0);
  });
});

describe('getFailedEstimateRow', () => {
  const base = {estimateFailed: true, pickedRoute: false, routeCount: 2, viaName: 'Basket1'};

  it('keeps a row without a via line when 2 or more routes failed', () => {
    expect(getFailedEstimateRow(base)).toEqual({via: null});
    expect(getFailedEstimateRow({...base, routeCount: 31})).toEqual({via: null});
  });

  it('names the basket only for the route the user picked', () => {
    expect(getFailedEstimateRow({...base, pickedRoute: true})).toEqual({via: 'Basket1'});
    expect(getFailedEstimateRow({...base, pickedRoute: true, viaName: null})).toEqual({via: null});
  });

  it('gives no row with one route, or without a failure', () => {
    expect(getFailedEstimateRow({...base, routeCount: 1})).toBeNull();
    expect(getFailedEstimateRow({...base, routeCount: 0})).toBeNull();
    expect(getFailedEstimateRow({...base, estimateFailed: false})).toBeNull();
  });
});
