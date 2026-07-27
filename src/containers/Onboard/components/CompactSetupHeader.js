import React from 'react';
import ProgressHeader from '../../../components/ProgressHeader';

const CompactSetupHeader = ({onBack, progress = 0.25}) => {
  return <ProgressHeader onBack={onBack} progress={progress} />;
};

export default CompactSetupHeader;
