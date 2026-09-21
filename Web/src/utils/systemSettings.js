const SETTINGS_KEY = 'friggy_system_settings';

export const defaultSystemSettings = {
  supportHotline: '0854340045 - 0398050670',
  supportEmail: 'friggy@gmail.com',
  workingHours: 'Hỗ trợ 24/7 (Phản hồi trong 5 phút)',
  downloadUrl: 'https://friggy.ai/download',
  qrImageUrl: '',
};

/**
 * Đọc cấu hình hệ thống (ưu tiên localStorage để giữ dữ liệu khi F5 reload trang)
 */
export const getSystemSettings = () => {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...defaultSystemSettings, ...parsed };
    }
  } catch (e) {
    console.error('Lỗi khi đọc system settings:', e);
  }
  return defaultSystemSettings;
};

/**
 * Lưu cấu hình hệ thống (Lưu vào localStorage và phát event đồng bộ giao diện)
 */
export const saveSystemSettings = (settings) => {
  try {
    const current = getSystemSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('system_settings_updated'));
    }
    return updated;
  } catch (e) {
    console.error('Lỗi khi lưu system settings:', e);
    return null;
  }
};

/**
 * Khôi phục cấu hình mặc định
 */
export const resetSystemSettings = () => {
  try {
    localStorage.removeItem(SETTINGS_KEY);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('system_settings_updated'));
    }
  } catch (e) {
    console.error('Lỗi khi reset system settings:', e);
  }
  return defaultSystemSettings;
};



