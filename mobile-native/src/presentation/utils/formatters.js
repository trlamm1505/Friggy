// Formatters - mapping từ utils/formatters.dart
export const formatVND = (amount) => {
  if (typeof amount !== 'number') return '0 đ';
  return new Intl.NumberFormat('vi-VN').format(amount) + ' đ';
};

export const formatDate = (date, format = 'dd/MM/yyyy') => {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return format
    .replace('dd', day)
    .replace('MM', month)
    .replace('yyyy', year)
    .replace('HH', hours)
    .replace('mm', minutes);
};

export const daysUntil = (date) => {
  const target = new Date(date);
  const now = new Date();
  const diff = target.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

export const formatCount = (n) => {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return String(n);
};
