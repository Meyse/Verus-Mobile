import {Platform, StyleSheet} from 'react-native';
import Colors from '../../globals/colors';
import {fontStyle} from '../../globals/fonts';

const androidFontPaddingFix =
  Platform.OS === 'android' ? {includeFontPadding: false} : {};

export default StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    marginBottom: 8,
    color: Colors.quaternaryColor,
    fontSize: 14,
    lineHeight: 19,
    ...fontStyle('semiBold'),
  },
  inputShell: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 12,
    backgroundColor: '#F3F5F8',
  },
  singleLineInputShell: {
    height: 56,
  },
  compactInputShell: {
    minHeight: 48,
    height: 48,
  },
  multilineInputShell: {
    alignItems: 'flex-start',
  },
  inputShellFocused: {
    borderColor: Colors.primaryColor,
    backgroundColor: Colors.secondaryColor,
    shadowColor: Colors.primaryColor,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 3,
  },
  inputShellError: {
    borderColor: Colors.warningButtonColor,
  },
  input: {
    flex: 1,
    paddingHorizontal: 16,
    color: Colors.quinaryColor,
    fontSize: 17,
    ...fontStyle('regular'),
  },
  singleLineInput: {
    height: 30,
    paddingVertical: 0,
    textAlignVertical: 'center',
    ...androidFontPaddingFix,
  },
  compactInput: {
    height: 44,
    paddingHorizontal: 0,
    paddingVertical: 0,
    fontSize: 16,
    lineHeight: 22,
    textAlignVertical: 'center',
    ...androidFontPaddingFix,
  },
  multilineInput: {
    minHeight: 54,
    paddingVertical: 13,
    lineHeight: 24,
    textAlignVertical: 'top',
    ...androidFontPaddingFix,
  },
  leftAccessory: {
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 10,
  },
  compactLeftAccessory: {
    width: 44,
    height: 44,
    paddingLeft: 0,
  },
  rightAction: {
    width: 48,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactRightAction: {
    width: 44,
    height: 44,
  },
  supportingText: {
    marginTop: 7,
    color: Colors.verusDarkGray,
    fontSize: 13,
    lineHeight: 18,
    ...fontStyle('regular'),
  },
  errorText: {
    color: Colors.warningButtonColor,
  },
});
