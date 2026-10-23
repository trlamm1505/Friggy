import React from 'react';
import { RecipeManagement as SharedRecipeManagement } from '../../../components/management/RecipeManagement/RecipeManagement';

export const RecipeManagement = (props) => {
  return <SharedRecipeManagement role="manager" {...props} />;
};

export default RecipeManagement;
