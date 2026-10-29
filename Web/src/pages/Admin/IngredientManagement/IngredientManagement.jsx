import React from 'react';
import { IngredientManagement as SharedIngredientManagement } from '../../../components/management/IngredientManagement/IngredientManagement';

export const IngredientManagement = (props) => {
  return <SharedIngredientManagement role="admin" {...props} />;
};

export default IngredientManagement;
