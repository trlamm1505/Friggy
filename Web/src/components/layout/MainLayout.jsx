import React from 'react';
import { Header } from '../common/Header';
import { Footer } from '../common/Footer';

export const MainLayout = ({ children }) => {
  return (
    <div className="layout-container">
      <Header />
      <main className="main-content">
        {children}
      </main>
      <Footer />
    </div>
  );
};
