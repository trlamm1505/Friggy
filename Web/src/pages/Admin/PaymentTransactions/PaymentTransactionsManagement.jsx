import React from 'react';
import { PaymentTransactionsManagement as SharedPaymentTransactionsManagement } from '../../../components/management/PaymentTransactions/PaymentTransactionsManagement';

export const PaymentTransactionsManagement = (props) => {
  return <SharedPaymentTransactionsManagement role="admin" {...props} />;
};

export default PaymentTransactionsManagement;
