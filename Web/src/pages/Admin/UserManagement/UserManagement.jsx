import React from 'react';
import { UserManagement as SharedUserManagement } from '../../../components/management/UserManagement/UserManagement';

export const UserManagement = (props) => {
  return <SharedUserManagement role="admin" {...props} />;
};

export default UserManagement;
