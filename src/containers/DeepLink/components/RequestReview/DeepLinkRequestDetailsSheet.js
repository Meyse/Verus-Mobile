import React from 'react';
import DeepLinkRequestInfoSection from './DeepLinkRequestInfoSection';
import DeepLinkRequestSheetScaffold from './DeepLinkRequestSheetScaffold';

const DeepLinkRequestDetailsSheet = ({
  onClose,
  sections = [],
  visible,
}) => {
  return (
    <DeepLinkRequestSheetScaffold
      visible={visible}
      onClose={onClose}
      maxHeight="78%"
      title="Request details">
      {sections.map(section => (
        <DeepLinkRequestInfoSection
          key={section.title}
          title={section.title}
          rows={section.rows}
        />
      ))}
    </DeepLinkRequestSheetScaffold>
  );
};

export default DeepLinkRequestDetailsSheet;
