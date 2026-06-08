/*
  This component serves as a wrapper for native modals so that they
  exhibit expected behaviour
*/

import React, { Component } from "react";
import { connect } from 'react-redux';
import {
  KeyboardAvoidingView,
  Modal as NativeModal,
  Platform
} from 'react-native'
import getUid from '../utils/uid'
import { PUSH_MODAL, REMOVE_MODAL } from "../utils/constants/storeType";

class Modal extends Component {
  constructor(props) {
    super(props);

    this.uid = getUid()
  }

  componentDidMount() {
    if (this.props.visible) this.pushSelf()
  }

  componentWillUnmount() {
    this.removeSelf()
  }

  componentDidUpdate(lastProps) {
    if (!lastProps.visible && this.props.visible) this.pushSelf()
    else if (lastProps.visible && !this.props.visible) this.removeSelf()
  }

  pushSelf() {
    this.props.dispatch({
      type: PUSH_MODAL,
      payload: {
        modal: this.uid
      }
    })
  }

  removeSelf() {
    this.props.dispatch({
      type: REMOVE_MODAL,
      payload: {
        modal: this.uid
      }
    })
  }

  render() {
    const {
      avoidKeyboard,
      children,
      keyboardVerticalOffset,
      ...modalProps
    } = this.props;
    const modalChildren = avoidKeyboard ? (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={keyboardVerticalOffset || 0}
        style={{ flex: 1 }}
      >
        {children}
      </KeyboardAvoidingView>
    ) : children;

    return (
      <NativeModal
        {...modalProps}
        visible={
          this.props.visible &&
          this.props.modalStack[this.props.modalStack.length - 1] === this.uid
        }
      >
        {modalChildren}
      </NativeModal>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    modalStack: state.modal.stack
  }
};

export default connect(mapStateToProps)(Modal);
