import React from 'react';
import {View} from 'react-native';
import {RegistrationListItem} from './RegistrationDesign';

// Summaries are the upstream public Redux projection. Opening a row only
// resumes a job; it cannot approve either payment or link automatically.
export default function RegistrationTabRows({jobs, navigation}) {
  const rows = Object.values(jobs || {}).sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt));
  if (!rows.length) return null;
  return <View style={{gap: 12, marginBottom: 12}}>
    {rows.map(job => <RegistrationListItem key={job.id} job={job} onPress={() => navigation.navigate('IdentityRegistration', {
      screen: job.status === 'commitment_prepared' ? 'IdentityCommitmentReview'
        : job.status === 'registration_prepared' ? 'IdentityRegistrationReview' : 'IdentityRegistrationProgress',
      params: {jobId: job.id},
    })} />)}
  </View>;
}
