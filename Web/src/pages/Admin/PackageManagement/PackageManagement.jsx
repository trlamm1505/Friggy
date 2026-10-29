import React from 'react';
import { PackageManagement as SharedPackageManagement } from '../../../components/management/PackageManagement/PackageManagement';

export const PackageManagement = (props) => {
  return <SharedPackageManagement role="admin" {...props} />;
};

export default PackageManagement;
