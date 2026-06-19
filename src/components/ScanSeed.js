/*
  This component simply allows a user to scan a qr code 
  to fill out their wallet seed field
*/

import React, { Component } from "react";
import {
  View,
  Alert,
} from "react-native";
import Styles from '../styles/index'
import BarcodeReader from "./BarcodeReader/BarcodeReader";
import AppButton from "./AppButton";

const FORMAT_UNKNOWN = "QR Data format unrecognized."

class ScanSeed extends Component {
  constructor(props) {
    super(props)
  }

  onSuccess(codes) {
    let result = codes[0] ? codes[0].value : null;

    if (result != null && typeof result === "string" && result.length <= 5000 && this.props.onScan) {
      this.props.onScan(result)
    } else {
      this.errorHandler(FORMAT_UNKNOWN)
    }
  }

  errorHandler = (error) => {
    Alert.alert("Error", error);
    this.cancelHandler()
  }

  cancelHandler = () => {
    if (this.props.cancel) {
      this.props.cancel()
    }
  }

  render() {
    return (
      <View style={Styles.blackRoot}>
        <BarcodeReader
          prompt="Scan private key QR"
          promptPlacement="top"
          safeBottomButton
          maskProps={{
            width: 248,
            height: 248,
            edgeWidth: 28,
            edgeHeight: 28,
            edgeColor: '#F4F7FB',
            edgeBorderWidth: 5,
            edgeRadius: 2,
            backgroundColor: '#07111F',
            outerMaskOpacity: 0.78,
            showAnimatedLine: true,
            animatedLineColor: '#64C875',
            animatedLineHeight: 1,
            animatedLineWidth: 200,
            lineAnimationDuration: 3600,
          }}
          onScan={(codes) => this.onSuccess(codes)}
          button={() => (
            <AppButton
              height={56}
              onPress={this.cancelHandler}
              themeMode="dark"
              variant="secondary"
            >
              {"Cancel"}
            </AppButton>
          )}
        />
      </View>
    );
  }
}

export default ScanSeed;
