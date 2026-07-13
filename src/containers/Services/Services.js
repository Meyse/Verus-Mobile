/*
  This component represents the screen the user will
  use to configure connected wallet services like Wyre
*/  

import { Component } from "react"
import { connect } from 'react-redux'
import { ServicesRender } from "./Services.render"
import SignedInServicesHome from './SignedInServicesHome';
import {ENABLE_SIGNED_IN_REDESIGN} from '../../../env/index';

class Services extends Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  render() {
    if (ENABLE_SIGNED_IN_REDESIGN) {
      return <SignedInServicesHome navigation={this.props.navigation} />;
    }

    return ServicesRender.call(this);
  }
}

const mapStateToProps = (state) => {
  return {}
};

export default connect(mapStateToProps)(Services);
