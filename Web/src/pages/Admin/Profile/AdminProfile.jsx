import React from 'react';
import { ProfileManagement as SharedProfileManagement } from '../../../components/management/Profile/ProfileManagement';

export const AdminProfile = (props) => {
  return <SharedProfileManagement role="admin" {...props} />;
};

export default AdminProfile;
