import { StyleSheet } from "react-native";
import Colors from '../../globals/colors';
import {fontStyle} from '../../globals/fonts';

export default styles = StyleSheet.create({
  loadingRoot: {
    backgroundColor: Colors.primaryColor,
    height: "100%",
    width: "100%"
  },
  loadingLabel: {
    backgroundColor: "transparent",
    marginTop: 15,
    fontSize: 18,
    textAlign: "center",
    color: Colors.quinaryColor,
    width: "70%",
    ...fontStyle('regular'),
    fontWeight: 'normal'
  },
});
