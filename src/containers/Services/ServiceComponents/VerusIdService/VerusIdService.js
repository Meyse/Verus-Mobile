import React, { Component } from "react"
import { connect } from 'react-redux'
import { setServiceLoading } from "../../../../actions/actionCreators";
import { createAlert } from "../../../../actions/actions/alert/dispatchers/alert";
import { requestServiceStoredData } from "../../../../utils/auth/authBox";
import { VERUSID_SERVICE_ID } from "../../../../utils/constants/services";
import { VerusIdServiceRender } from "./VerusIdService.render";
import {ENABLE_SIGNED_IN_REDESIGN} from '../../../../../env/index';

class VerusIdService extends Component {
  constructor(props) {
    super(props);
    this.state = {
      linkedIds: null,
      loadError: null,
    };

    this.props.navigation.setOptions({title: 'VerusID'});
  }

  async getLinkedIds() {
    this.props.dispatch(setServiceLoading(true, VERUSID_SERVICE_ID));
    this.setState({loadError: null});

    try {
      const verusIdServiceData = await requestServiceStoredData(
        VERUSID_SERVICE_ID,
      );
      
      if (verusIdServiceData.linked_ids) {
        this.setState({
          linkedIds: verusIdServiceData.linked_ids,
        });
      } else {
        this.setState({
          linkedIds: {},
        });
      }
    } catch (e) {
      if (ENABLE_SIGNED_IN_REDESIGN) {
        this.setState({linkedIds: {}, loadError: e.message || 'Failed to load VerusIDs'});
      } else {
        createAlert('Error Loading Linked VerusIDs', e.message);
      }
    }

    this.props.dispatch(setServiceLoading(false, VERUSID_SERVICE_ID));
  }

  componentDidMount() {
    this.getLinkedIds();
  }

  componentDidUpdate(lastProps) {
    if (lastProps.encryptedIds !== this.props.encryptedIds) {
      this.getLinkedIds()
    }
  }

  render() {
    return VerusIdServiceRender.call(this);
  }
}

const mapStateToProps = state => {
  return {
    loading: state.services.loading[VERUSID_SERVICE_ID],
    encryptedIds: state.services.stored[VERUSID_SERVICE_ID],
    activeAccount: state.authentication.activeAccount,
  };
};

export default connect(mapStateToProps)(VerusIdService);
