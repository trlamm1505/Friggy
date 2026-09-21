import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import ToastContainer from './components/common/Toast';
import Router from './routes/router';

function App() {
  return (
    <BrowserRouter>
      <ToastContainer />
      <Router />
    </BrowserRouter>
  );
}

export default App;
