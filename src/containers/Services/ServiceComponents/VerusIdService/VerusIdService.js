import React, { Component } from "react"
import { connect } from 'react-redux'
import { setServiceLoading } from "../../../../actions/actionCreators";
import { requestServiceStoredData } from "../../../../utils/auth/authBox";
import { VERUSID_SERVICE_ID } from "../../../../utils/constants/services";
import { VerusIdServiceRender } from "./VerusIdService.render";

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
    // A re-read keeps the rows on screen. Only a load with no data shown
    // (the first load, or Try again after it failed) shows the skeleton.
    const hasRows = this.state.linkedIds != null && this.state.loadError == null;

    this.props.dispatch(setServiceLoading(true, VERUSID_SERVICE_ID));
    if (!hasRows) this.setState({linkedIds: null, loadError: null});

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
      // A failed re-read keeps the rows that are already on screen.
      if (!hasRows) {
        this.setState({linkedIds: {}, loadError: e.message || 'Failed to load VerusIDs'});
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
