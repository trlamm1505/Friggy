import React from 'react';
import { APP_NAME } from '../../utils/constants';

export const Footer = () => {
  return (
    <footer className="app-footer">
      <p>&copy; {new Date().getFullYear()} {APP_NAME}. All rights reserved.</p>
    </footer>
  );
};
