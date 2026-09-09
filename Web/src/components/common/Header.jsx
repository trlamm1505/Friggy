import React from 'react';
import { APP_NAME } from '../../utils/constants';

export const Header = () => {
  return (
    <header className="app-header">
      <div className="logo">{APP_NAME}</div>
      <nav className="nav-links">
        <a href="#home">Home</a>
        <a href="#features">Features</a>
        <a href="#about">About</a>
      </nav>
    </header>
  );
};
