import React from 'react';
import { UserManagement as SharedUserManagement } from '../../../components/management/UserManagement/UserManagement';

export const UserManagement = (props) => {
  return <SharedUserManagement role="manager" {...props} />;
};

export default UserManagement;
