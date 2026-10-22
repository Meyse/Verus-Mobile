/*
  This component simply allows a user to scan a qr code
  to fill out their wallet seed field
*/

import React, { Component } from "react";
import { Alert } from "react-native";
import ScannerScreen from "./BarcodeReader/ScannerScreen";

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
      <ScannerScreen
        onBack={this.cancelHandler}
        onScan={(codes) => this.onSuccess(codes)}
        title="Scan QR code"
      />
    );
  }
}

export default ScanSeed;
