// OS-2: the "Import Secret Recovery Phrase" editor accepts every BIP39
// length (12, 15, 18, 21 and 24 words), as upstream did. The phrases are the
// public all-zero BIP39 test vectors, not wallet phrases.
const mockClipboard = {getString: jest.fn()};

jest.mock('react-native', () => require('../../../tests/helpers/mockReactNative')({
  Clipboard: mockClipboard,
  Keyboard: {dismiss: jest.fn()},
  TouchableWithoutFeedback: 'TouchableWithoutFeedback',
  View: 'View',
}));
jest.mock('react-native-paper', () => ({Chip: 'Chip', Text: 'Text'}));
jest.mock('react-native-svg', () => ({
  __esModule: true,
  default: 'Svg',
  Defs: 'Defs',
  LinearGradient: 'LinearGradient',
  Rect: 'Rect',
  Stop: 'Stop',
}));
jest.mock('../../../components/AppButton', () => 'AppButton');
jest.mock('../../../components/AppTextInput', () => {
  const React = require('react');
  return React.forwardRef((props, _ref) => React.createElement('AppTextInput', props));
});
jest.mock('../../../components/KeyboardAvoidingForm', () => 'KeyboardAvoidingForm');
jest.mock('../../../components/SafeBottomActionStack', () => 'SafeBottomActionStack');
let mockKeyboardVisible = false;
jest.mock('../../../hooks/useOnboardingSmallDeviceLayout', () => ({
  ONBOARDING_KEYBOARD_FOOTER_SPACING: 8,
  useOnboardingSmallDeviceLayout: () => ({
    keyboardVisible: mockKeyboardVisible,
    smallDevice: false,
  }),
}));

const React = require('react');
const {act, create} = require('react-test-renderer');
const ImportSeed = require('../../../containers/CreateWallet/Forms/ImportWallet/Forms/ImportSeed').default;

const zeroVector = (count, lastWord) => `${'abandon '.repeat(count - 1)}${lastWord}`;
const VECTORS = [
  [12, zeroVector(12, 'about')],
  [15, zeroVector(15, 'address')],
  [18, zeroVector(18, 'agent')],
  [21, zeroVector(21, 'admit')],
  [24, zeroVector(24, 'art')],
];
// Valid 24 words whose first 12 words are also a valid 12-word phrase.
const PREFIX_VALID_24 = `${zeroVector(12, 'about')} ${zeroVector(12, 'almost')}`;

describe('ImportSeed phrase lengths', () => {
  let renderer;
  let props;

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockKeyboardVisible = false;
    mockClipboard.getString.mockReset();
    props = {importedSeed: null, setImportedSeed: jest.fn(), onComplete: jest.fn()};
    act(() => {
      renderer = create(<ImportSeed {...props} />);
    });
  });

  afterEach(() => {
    act(() => renderer.unmount());
    jest.restoreAllMocks();
  });

  const byTestID = testID => renderer.root.findAll(node =>
    node.props.testID === testID && typeof node.type === 'string');
  const footer = () => renderer.root.findAllByType('AppButton')
    .find(button => button.props.height === 56);
  const texts = () => renderer.root.findAllByType('Text')
    .map(node => [].concat(node.props.children).join(''));
  const wordSlots = () => renderer.root.findAll(node =>
    typeof node.type === 'string' &&
    String(node.props.testID).startsWith('onboarding.importSeed.wordSlot.'));
  const paste = async text => {
    mockClipboard.getString.mockResolvedValue(text);
    await act(async () => {
      await byTestID('onboarding.importSeed.paste')[0].props.onPress();
    });
  };
  const typeWord = word => {
    const input = renderer.root.findByType('AppTextInput');
    act(() => input.props.onChangeText(word));
    act(() => renderer.root.findByType('AppTextInput').props.onSubmitEditing());
  };

  it.each(VECTORS)('imports a pasted %i-word phrase exactly', async (count, phrase) => {
    await paste(phrase);

    expect(footer().props.testID).toBe('onboarding.importSeed.import');
    expect(footer().props.children).toBe('Import wallet');
    expect(footer().props.disabled).toBe(false);
    // Review shows only the words of the phrase.
    expect(wordSlots()).toHaveLength(count);

    act(() => footer().props.onPress());

    expect(props.onComplete).toHaveBeenCalledTimes(1);
    expect(props.onComplete).toHaveBeenCalledWith(phrase);
    // The parent keeps the same text, with no empty slots.
    expect(props.setImportedSeed).toHaveBeenLastCalledWith(phrase);
  });

  it.each([12, 24])('imports a pasted %i-word phrase with extra spaces as single-spaced words', async count => {
    const phrase = VECTORS.find(([length]) => length === count)[1];
    // Leading, trailing and double spaces, a tab and a line break.
    const messy = `  ${phrase.split(' ').join('  ').replace('  ', ' \t').replace('  ', '\n ')}  `;
    await paste(messy);

    expect(footer().props.testID).toBe('onboarding.importSeed.import');
    expect(wordSlots()).toHaveLength(count);
    act(() => footer().props.onPress());
    expect(props.onComplete).toHaveBeenCalledWith(phrase);
  });

  it('shows the checksum error for 12 valid words with a wrong checksum', async () => {
    await paste('abandon '.repeat(12).trim());

    expect(texts()).toContain(
      'The words are valid, but the phrase checksum does not match.',
    );
    expect(footer().props.testID).toBe('onboarding.importSeed.import');
    expect(footer().props.disabled).toBe(true);
    act(() => footer().props.onPress());
    expect(props.onComplete).not.toHaveBeenCalled();
  });

  it('opens the wrong word of a pasted 12-word phrase for a fix', async () => {
    const words = zeroVector(12, 'about').split(' ');
    words[4] = 'qqqq';
    await paste(words.join(' '));

    expect(byTestID('onboarding.importSeed.import')).toHaveLength(0);
    expect(texts()).toContain('Word 5 of 24');
    expect(renderer.root.findByType('AppTextInput').props.value).toBe('qqqq');
  });

  it('stays in word entry and explains the lengths for a 13-word paste', async () => {
    await paste(`${zeroVector(12, 'about')} abandon`);

    expect(byTestID('onboarding.importSeed.import')).toHaveLength(0);
    expect(texts()).toContain('Word 14 of 24');
    expect(renderer.root.findByType('AppTextInput').props.helperText).toBe(
      'A phrase has 12, 15, 18, 21 or 24 words.',
    );
  });

  it('does not open Review while a longer phrase is typed', () => {
    const words = PREFIX_VALID_24.split(' ');

    words.slice(0, 12).forEach(typeWord);

    // The first 12 words are a valid phrase, but the user may type more.
    expect(byTestID('onboarding.importSeed.import')).toHaveLength(0);
    expect(texts()).toContain('Word 13 of 24');

    words.slice(12).forEach(typeWord);

    expect(footer().props.testID).toBe('onboarding.importSeed.import');
    act(() => footer().props.onPress());
    expect(props.onComplete).toHaveBeenCalledWith(PREFIX_VALID_24);
  });

  it('offers Review for a typed 12-word phrase when the keyboard closes', () => {
    zeroVector(12, 'about').split(' ').forEach(typeWord);

    // Close the keyboard: tap outside the word entry.
    act(() => renderer.root.findByType('TouchableWithoutFeedback').props.onPress());

    expect(texts()).toContain('12 words is a complete phrase. Review it, or keep typing.');
    expect(footer().props.testID).toBe('onboarding.importSeed.review');
    act(() => footer().props.onPress());
    expect(footer().props.testID).toBe('onboarding.importSeed.import');
    act(() => footer().props.onPress());
    expect(props.onComplete).toHaveBeenCalledWith(zeroVector(12, 'about'));
  });

  it('reopens typed words in entry, and a given whole phrase in Review', () => {
    const phrase = zeroVector(12, 'about');
    // The text the editor saved for 12 typed words and 12 empty slots.
    act(() => renderer.update(
      <ImportSeed {...props} importedSeed={`${phrase}${' '.repeat(12)}`} />,
    ));
    expect(byTestID('onboarding.importSeed.import')).toHaveLength(0);
    expect(texts()).toContain('Word 13 of 24');

    // A whole phrase from elsewhere, such as a scan.
    act(() => renderer.update(<ImportSeed {...props} importedSeed={phrase} />));
    expect(footer().props.testID).toBe('onboarding.importSeed.import');
    expect(wordSlots()).toHaveLength(12);
  });

  it('does not open Review for a paste of more than 24 words', async () => {
    // 24 valid words and one more: the first 24 alone are a valid phrase.
    await paste(`${zeroVector(24, 'art')} abandon`);

    expect(byTestID('onboarding.importSeed.import')).toHaveLength(0);
    expect(renderer.root.findByType('AppTextInput').props.helperText).toBe(
      'Only the first 24 words were used.',
    );
  });

  it('offers Review when the keyboard closes without a tap outside', () => {
    mockKeyboardVisible = true;
    act(() => renderer.update(<ImportSeed {...props} />));
    zeroVector(12, 'about').split(' ').forEach(typeWord);
    expect(byTestID('onboarding.importSeed.review')).toHaveLength(0);

    // Android Back or an iOS swipe closes the keyboard.
    mockKeyboardVisible = false;
    act(() => renderer.update(<ImportSeed {...props} />));

    expect(footer().props.testID).toBe('onboarding.importSeed.review');
  });
});

// The parent passes the saved text back as importedSeed, as the onboarding
// and import screens do.
describe('ImportSeed with a parent that keeps the text', () => {
  it('stays in Review after a 12-word paste and imports the phrase', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockKeyboardVisible = false;
    const phrase = zeroVector(12, 'about');
    const onComplete = jest.fn();
    const saved = [];
    const Parent = () => {
      const [importedSeed, setImportedSeed] = React.useState(null);
      const save = value => {
        saved.push(value);
        setImportedSeed(value);
      };
      return (
        <ImportSeed
          importedSeed={importedSeed}
          onComplete={onComplete}
          setImportedSeed={save}
        />
      );
    };
    let view;
    act(() => {
      view = create(<Parent />);
    });
    mockClipboard.getString.mockResolvedValue(phrase);
    await act(async () => {
      await view.root
        .find(node => node.props.testID === 'onboarding.importSeed.paste' && typeof node.type === 'string')
        .props.onPress();
    });

    // The parent got the slot text with 12 empty slots, and passed it back.
    expect(saved[0]).toBe(`${phrase}${' '.repeat(12)}`);
    const importButton = () => view.root.findAll(
      node => node.props.testID === 'onboarding.importSeed.import' && typeof node.type === 'string',
    );
    expect(importButton()).toHaveLength(1);
    act(() => importButton()[0].props.onPress());
    expect(onComplete).toHaveBeenCalledWith(phrase);
    expect(saved[saved.length - 1]).toBe(phrase);
    act(() => view.unmount());
    jest.restoreAllMocks();
  });
});

