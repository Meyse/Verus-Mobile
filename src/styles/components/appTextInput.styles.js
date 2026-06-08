import {StyleSheet} from 'react-native';
import Colors from '../../globals/colors';
import {fontStyle} from '../../globals/fonts';

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
    minHeight: 54,
    flex: 1,
    paddingHorizontal: 16,
    color: Colors.quinaryColor,
    fontSize: 16,
    lineHeight: 22,
    ...fontStyle('regular'),
  },
  leftAccessory: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 10,
  },
  rightAction: {
    width: 48,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
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
