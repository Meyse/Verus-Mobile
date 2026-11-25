import React from 'react';
import renderer, {act} from 'react-test-renderer';
import {Provider as PaperProvider, TextInput} from 'react-native-paper';
import theme from '../paperTheme';

// Paper 5.15 TextInput reads theme.fonts.regular.fontWeight on an MD2 theme. With the app's theme it threw
// "Cannot read property 'fontWeight' of undefined" (onboarding password, Add currency, VerusID name).
describe('app Paper theme', () => {
  it.each(['outlined', 'flat'])('renders a %s TextInput', mode => {
    let tree;
    act(() => {
      tree = renderer.create(
        <PaperProvider theme={theme}>
          <TextInput mode={mode} label="Name" value="" onChangeText={() => {}} />
        </PaperProvider>,
      );
    });
    expect(tree.root.findAllByType(TextInput)).toHaveLength(1);
  });

  it('keeps the system font in Paper inputs, as before Paper 5.15', () => {
    let tree;
    act(() => {
      tree = renderer.create(
        <PaperProvider theme={theme}>
          <TextInput mode="outlined" label="Name" value="" onChangeText={() => {}} />
        </PaperProvider>,
      );
    });
    const input = tree.root.find(node => node.type === 'TextInput');
    const style = Object.assign({}, ...[input.props.style].flat(Infinity).filter(Boolean));
    expect(style.fontFamily).toBeUndefined();
  });
});
