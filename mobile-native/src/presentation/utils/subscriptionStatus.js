/**
 * subscriptionStatus - map trạng thái gói của BE -> nhãn tiếng Việt.
 *
 * ⚠️ VÌ SAO TÁCH RA (19/11):
 *   `statusLabel` trước đây nằm trong `PackageManagementScreen.jsx`. Màn
 *   "Gói của tôi" (`MyPackagesScreen`) cũng cần hiện trạng thái -> nếu import
 *   thẳng từ 1 màn hình, sẽ kéo theo toàn bộ dependency của màn đó (assets,
 *   navigation, các sheet con) -> nặng và dễ vòng import.
 *   => Gom vào file util, cả 2 màn cùng dùng.
 *
 * ⚠️ UI KHÔNG HIỂN THỊ RAW ENUM:
 *   BE dùng `active | pending | cancelled | expired` -> map sang nhãn tiếng
 *   Việt. Status lạ -> fallback `expired` (không lộ enum kỹ thuật cho user).
 *
 * R7: comment tiếng Việt.
 */

/**
 * Map status của BE -> key i18n tương ứng.
 *
 * @param {string|undefined|null} status - status của BE
 * @param {(key:string, opts?:object)=>string} t - hàm dịch i18n
 * @returns {string} key i18n
 */
export const statusLabel = (status, t) => {
  switch (status) {
    case 'active':
      return t('subscription.statusActive');
    case 'pending':
      return t('subscription.statusPending');
    case 'cancelled':
      return t('subscription.statusCancelled');
    case 'expired':
      return t('subscription.statusExpired');
    default:
      return t('subscription.statusExpired');
  }
};

export default statusLabel;
