import React from 'react';
import { ProfileManagement as SharedProfileManagement } from '../../../components/management/Profile/ProfileManagement';

export const ManagerProfile = (props) => {
  return <SharedProfileManagement role="manager" {...props} />;
};

export default ManagerProfile;
