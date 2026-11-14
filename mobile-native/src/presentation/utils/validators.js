// Validators - mapping từ utils/validators.dart
export const isValidEmail = (email) => {
  const re = /^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/;
  return re.test(String(email).trim());
};

export const isValidPassword = (password) => {
  return password && password.length >= 6;
};

export const isValidPhone = (phone) => {
  const re = /^(0|\+84)[0-9]{9,10}$/;
  return re.test(String(phone).trim().replace(/\s/g, ''));
};

export const isEmpty = (value) => {
  return value === null || value === undefined || String(value).trim() === '';
};
