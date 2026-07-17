import React from "react";
import {Portal} from "react-native-paper";
import ListSelectionModal from "../../../../components/ListSelectionModal/ListSelectionModal";
import TextInputModal from "../../../../components/TextInputModal/TextInputModal";
import {
  SettingsLoadingState,
  SettingsNotice,
  SettingsRow,
  SettingsScreen,
  SettingsSection,
} from '../../components/SettingsScaffold';

export const VrpcOverridesRender = function () {
  return (
    <>
        <Portal>
          {this.state.addVrpcOverrideModal.open && (
            <TextInputModal
              visible={
                this.state.addVrpcOverrideModal.open
              }
              onChange={() => {}}
              cancel={(text) =>
                this.finishAddVrpcOverrideModal(
                  text,
                  this.state.addVrpcOverrideModal.systemid
                )
              }
            />
          )}
          {this.state.editPropertyModal.open && (
            <ListSelectionModal
              title={this.state.editPropertyModal.label}
              flexHeight={0.5}
              visible={this.state.editPropertyModal.open}
              onSelect={(item) => this.selectEditPropertyButton(item.key)}
              data={this.EDIT_PROPERTY_BUTTONS}
              cancel={() => this.closeEditPropertyModal()}
            />
          )}
        </Portal>
        {this.state.loading ? 
          <SettingsLoadingState label="Checking RPC server…" />
            : 
          <SettingsScreen testID="settings.rpcServers">
            <SettingsSection title="RPC servers for systems">
            {Object.values(this.state.systems).map((system, index) => {
                return (
                    <SettingsRow
                      description={system.display_name}
                      descriptionNumberOfLines={3}
                      icon="server-network"
                      key={system.system_id}
                      onPress={() =>
                        this.openEditPropertyModal(
                          `Edit RPC server`,
                          system.system_id
                        )
                      }
                      title={
                        this.state.vrpcOverridesSettings.vrpcOverrides && this.state.vrpcOverridesSettings.vrpcOverrides[system.system_id] ?
                          this.state.vrpcOverridesSettings.vrpcOverrides[system.system_id][0]
                          :
                          system.vrpc_endpoints[0]
                      }
                    />
                );
              }) 
            }
            <SettingsRow
              icon="plus-circle-outline"
              last
              onPress={() => this.openAddVrpcServerModal()}
              title="Add RPC server"
            />
            </SettingsSection>
            <SettingsNotice
              body="Blockchain data for every currency on a listed network is fetched from its server. Changes take effect after Verus Mobile restarts. Only connect to servers you trust."
              icon="alert-outline"
              title="Trust and restart required"
            />
          </SettingsScreen>
        }
    </>
  );
};
