import {StyleSheet} from 'react-native';
import {fontStyle} from '../../globals/fonts';

export default StyleSheet.create({
  button: {
    borderRadius: 18,
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: {
      width: 0,
      height: 0,
    },
    elevation: 0,
  },
  content: {
    justifyContent: 'center',
  },
  label: {
    ...fontStyle('semiBold'),
    fontSize: 17,
    letterSpacing: 0,
  },
});
