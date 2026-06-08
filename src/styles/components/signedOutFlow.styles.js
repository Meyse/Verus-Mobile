import {StyleSheet} from 'react-native';
import Colors from '../../globals/colors';
import {fontStyle} from '../../globals/fonts';

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.secondaryColor,
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 54,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 54,
    paddingBottom: 24,
  },
  form: {
    width: '100%',
    maxWidth: 360,
    alignSelf: 'center',
  },
  title: {
    marginBottom: 28,
    color: Colors.quinaryColor,
    fontSize: 31,
    lineHeight: 38,
    ...fontStyle('semiBold'),
  },
  body: {
    color: Colors.quaternaryColor,
    fontSize: 16,
    lineHeight: 24,
    ...fontStyle('regular'),
  },
});
