import React from 'react';
import { SponsorManagement as SharedSponsorManagement } from '../../../components/management/SponsorManagement/SponsorManagement';

export const SponsorManagement = (props) => {
  return <SharedSponsorManagement role="manager" {...props} />;
};

export default SponsorManagement;
