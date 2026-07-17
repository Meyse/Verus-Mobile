import React from "react";
import {Portal} from "react-native-paper";
import ListSelectionModal from "../../../../components/ListSelectionModal/ListSelectionModal";
import TextInputModal from "../../../../components/TextInputModal/TextInputModal";
import { unixToDate } from "../../../../utils/math";
import { ADDRESS_BLOCKLIST_MANUAL, DEFAULT_ADDRESS_BLOCKLIST_WEBSERVER } from "../../../../utils/constants/constants";
import {
  SettingsNotice,
  SettingsRow,
  SettingsScreen,
  SettingsSection,
} from '../../components/SettingsScaffold';

export const AddressBlocklistRender = function () {
  const blocklistType = this.state.addressBlocklistSettings.addressBlocklistDefinition.type;
  const { title: blocklistTypeTitle, description: blocklistTypeDescription } = this.ADDRESS_BLOCKLIST_TYPE_DESCRIPTORS[blocklistType];
  
  return (
    <>
        <Portal>
          {this.state.addBlockedAddressModal.open && (
            <TextInputModal
              visible={
                this.state.addBlockedAddressModal.open
              }
              onChange={() => {}}
              cancel={(text) =>
                this.finishEditBlockedAddress(
                  text,
                  this.state.addBlockedAddressModal.index
                )
              }
            />
          )}
          {this.state.editBlockDefinitionDataModal.open && (
            <TextInputModal
              visible={
                this.state.editBlockDefinitionDataModal.open
              }
              onChange={() => {}}
              cancel={(text) =>
                this.finishEditBlockDefinitionData(
                  text
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
          {this.state.selectBlockTypeModal.open && (
            <ListSelectionModal
              title={this.state.selectBlockTypeModal.label}
              flexHeight={0.5}
              visible={this.state.selectBlockTypeModal.open}
              onSelect={(item) => this.selectBlockTypeButton(item.key)}
              data={this.BLOCKLIST_TYPE_BUTTONS}
              cancel={() => this.closeSelectBlockTypeModal()}
            />
          )}
        </Portal>
      <SettingsScreen testID="settings.addressBlocklist">
        <SettingsSection title="Blocklist source">
          <SettingsRow
          description={blocklistTypeDescription}
          icon="format-list-bulleted-type"
          last={blocklistType === ADDRESS_BLOCKLIST_MANUAL}
          onPress={() =>
            this.openSelectBlockTypeModal(
              `Blocklist Type`
            )
          }
          title={blocklistTypeTitle}
          value="Type"
          />
        {
          blocklistType !== ADDRESS_BLOCKLIST_MANUAL && (
              <SettingsRow
                description="Address blocklist source"
                descriptionNumberOfLines={3}
                icon="server-network"
                last
                onPress={() => this.openEditBlockDefinitionDataModal()}
                title={
                  this.state.addressBlocklistSettings.addressBlocklistDefinition.data
                    ? this.state.addressBlocklistSettings.addressBlocklistDefinition
                        .data
                    : DEFAULT_ADDRESS_BLOCKLIST_WEBSERVER
                }
              />
          )
        }
        </SettingsSection>
        <SettingsSection title="Blocked addresses">
          <SettingsRow
            icon="plus-circle-outline"
            last={this.state.addressBlocklistSettings.addressBlocklist.length === 0}
            onPress={() => this.openAddBlockedAddressModal()}
            title="Add blocked address"
          />
        {this.state.addressBlocklistSettings.addressBlocklist.map((blockedAddress, index) => {
            return (
              <SettingsRow
                description={`Last modified ${unixToDate(blockedAddress.lastModified)}`}
                icon="shield-remove-outline"
                key={`${blockedAddress.address}-${index}`}
                last={index === this.state.addressBlocklistSettings.addressBlocklist.length - 1}
                onPress={() =>
                  this.openEditPropertyModal(
                    `Address ${index + 1}`,
                    index
                  )
                }
                title={blockedAddress.address}
              />
            );
          }) 
        }
        </SettingsSection>
        <SettingsNotice
          body="Addresses in this list remain blocked by the wallet's send flow. Editing a server source changes where the list is loaded from."
          title="Send protection"
        />
      </SettingsScreen>
    </>
  );
};
