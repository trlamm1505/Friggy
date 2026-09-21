import React from 'react';
import toast, { Toaster } from 'react-hot-toast';

export const showToast = {
  success: (message, options = {}) => {
    return toast.success(message, {
      ...options,
      style: {
        background: '#ecfdf5',
        color: '#064e3b',
        border: '1px solid #a7f3d0',
        borderRadius: '16px',
        padding: '12px 18px',
        fontWeight: '600',
        fontSize: '14px',
        ...options.style,
      },
      iconTheme: {
        primary: '#10b981',
        secondary: '#ffffff',
      },
    });
  },

  error: (message, options = {}) => {
    return toast.error(message, {
      ...options,
      style: {
        background: '#fff1f2',
        color: '#881337',
        border: '1px solid #fecdd3',
        borderRadius: '16px',
        padding: '12px 18px',
        fontWeight: '600',
        fontSize: '14px',
        ...options.style,
      },
      iconTheme: {
        primary: '#f43f5e',
        secondary: '#ffffff',
      },
    });
  },

  info: (message, options = {}) => {
    return toast(message, {
      icon: 'ℹ️',
      ...options,
      style: {
        background: '#f0f9ff',
        color: '#0c4a6e',
        border: '1px solid #bae6fd',
        borderRadius: '16px',
        padding: '12px 18px',
        fontWeight: '600',
        fontSize: '14px',
        ...options.style,
      },
    });
  },

  warning: (message, options = {}) => {
    return toast(message, {
      icon: '⚠️',
      ...options,
      style: {
        background: '#fffbeb',
        color: '#78350f',
        border: '1px solid #fde68a',
        borderRadius: '16px',
        padding: '12px 18px',
        fontWeight: '600',
        fontSize: '14px',
        ...options.style,
      },
    });
  },

  promise: (promise, msgs, options = {}) => {
    return toast.promise(promise, msgs, {
      ...options,
      style: {
        borderRadius: '16px',
        padding: '12px 18px',
        fontWeight: '600',
        fontSize: '14px',
        ...options.style,
      },
    });
  },

  dismiss: (toastId) => toast.dismiss(toastId),
};

export const ToastContainer = () => {
  return (
    <Toaster
      position="top-right"
      reverseOrder={false}
      gutter={10}
      toastOptions={{
        duration: 3500,
      }}
    />
  );
};

export default ToastContainer;
