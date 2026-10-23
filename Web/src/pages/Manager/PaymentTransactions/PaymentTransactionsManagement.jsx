import React from 'react';
import { PaymentTransactionsManagement as SharedPaymentTransactionsManagement } from '../../../components/management/PaymentTransactions/PaymentTransactionsManagement';

export const PaymentTransactionsManagement = (props) => {
  return <SharedPaymentTransactionsManagement role="manager" {...props} />;
};

export default PaymentTransactionsManagement;
