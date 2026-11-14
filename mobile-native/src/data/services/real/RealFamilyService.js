/**
 * RealFamilyService - nối quản lý gia đình với BE.
 *
 * Sprint A3. Nguồn sự thật:
 *   BE      - `be/src/modules-api/family/family.controller.ts` + `dto/family.dto.ts`
 *   Flutter - `Mobile/lib/screens/family_management_screen.dart` (985 dòng)
 *             + `Mobile/lib/data/services/api_service.dart:757-806`
 *
 * Đối chiếu 23/10: API layer BE và Flutter KHỚP 100% (6 endpoint). Sai lệch ở shape:
 *   BE `FamilyRoleDto`   = `{ role: 'owner'|'member'|'none', group }`
 *   Mock RN (`family-members.json`) = `{ members: [...], inviteCode }` - KHÔNG có role!
 *   => BẮT BUỘC có mapper `toFamilyInfo()` (R1 - mục 9b.1).
 *
 * VÌ SAO 1 FILE RIÊNG NHƯNG VẪN ĐĂNG KÝ KEY `userService`:
 *   `ServiceProvider.jsx` là file IMMUTABLE (P0.5) với 5 key cố định.
 *   `resolveServices()` chỉ duyệt key có trong mock -> domain mới sẽ không bao
 *   giờ được trả về qua `useServices()`.
 *   => File này được `RealUserService` compose lại. Giữ nguyên fallback 5xx của
 *   `withFallback` (mock đã có sẵn trong `MockUserService`) và KHÔNG đụng file immutable.
 *
 * LƯU Ý - `POST /family/accept` & `/reject` là `@Public()`:
 *   BE `family.controller.ts:90-91` hardcode `userId = undefined` nên validate
 *   email (`family.service.ts:201-205`) KHÔNG BAO GIỜ chạy - BUG BE, đã ghi nhận
 *   trong plan (mục "BUG BE PHAT HIEN 23/10"). RN gửi Bearer mặc định nên khi BE
 *   sửa là tự có hiệu lực, KHÔNG cần sửa code RN.
 *
 * R2: mọi URL ảnh đi qua `appConfig.getImageUrl()`.
 * R5: chỉ đọc token qua ApiClient, KHÔNG import `useAuthStore`.
 */

import { ApiClient } from '../../api/ApiClient';
import { appConfig } from '../../../shared/config/appConfig';

/**
 * Mapper `FamilyMemberDto` -> shape member của UI.
 *
 * BE trả `invitedEmail` + `memberName` (null nếu chưa đăng ký) + `memberAvatar`.
 * UI hiện tại cần `name` + `avatar` -> fallback về email khi chưa có tên.
 */
export const toFamilyMember = (m) => ({
  id: m?.id ?? null,
  name: m?.memberName || m?.invitedEmail || 'Thành viên',
  email: m?.invitedEmail ?? null,
  // R2: BE trả đường dẫn tương đối -> phải qua getImageUrl
  avatar: m?.memberAvatar ? appConfig.getImageUrl(m.memberAvatar) : null,
  status: m?.status ?? 'pending',
  invitedAt: m?.invitedAt ?? null,
  joinedAt: m?.joinedAt ?? null,
});

/**
 * Mapper `FamilyRoleDto` -> shape family của UI.
 *
 * `role` là enum 3 giá trị từ BE (`family.service.ts:79,97,99`):
 *   - `owner`  -> chủ nhóm, thấy nút Mời / Xoá / Giải tán
 *   - `member` -> thành viên, KHÔNG thấy các nút đó
 *   - `none`   -> chưa có gia đình -> hiện empty state
 *
 * `group` là null khi `role === 'none'` -> UI phải xử lý cả 2 nhánh.
 */
export const toFamilyInfo = (res) => {
  const role = res?.role ?? 'none';
  const group = res?.group ?? null;
  return {
    role,
    // BE `group.members` KHÔNG bao gồm owner (`family.dto.ts:61`) - giữ nguyên,
    // UI hiển thị owner riêng từ `group.owner`.
    members: Array.isArray(group?.members) ? group.members.map(toFamilyMember) : [],
    owner: group?.owner
      ? {
          id: group.owner.id,
          name: group.owner.name || 'Chủ gia đình',
          avatar: group.owner.avatar ? appConfig.getImageUrl(group.owner.avatar) : null,
        }
      : null,
    activeCount: typeof group?.activeCount === 'number' ? group.activeCount : 0,
    maxMembers: typeof group?.maxMembers === 'number' ? group.maxMembers : 5,
    groupId: group?.id ?? null,
    groupStatus: group?.status ?? null,
    // BE KHÔNG có field `inviteCode` (chỉ có `inviteToken` tạm khi mời).
    // Mock RN có `inviteCode` -> giữ null, UI hiện mã mời chỉ khi có thật.
    inviteCode: null,
  };
};

/**
 * Service gia đình.
 *
 * KHÔNG tự đăng ký — `RealUserService` compose instance này rồi đăng ký key
 * `userService`. Xem comment đầu file để hiểu lý do.
 */
export class RealFamilyService {
  /**
   * GET /family/me - thông tin gia đình + role của user.
   *
   * BE trả `FamilyRoleDto` = `{ role, group }`.
   */
  async getFamily() {
    const res = await ApiClient.get('/family/me');
    return toFamilyInfo(res);
  }

  /**
   * POST /family/invite - mời thành viên qua email.
   *
   * BE trả **CHỈ `{ message }`** (`family.service.ts:180`) - KHÔNG trả danh sách
   * "đang chờ". Thành viên pending xuất hiện sau khi refresh `GET /family/me`
   * (vì `members[].status` có `pending`).
   *
   * @param {string} email - email người được mời (BE `@IsEmail()`).
   */
  async inviteMember(email) {
    const res = await ApiClient.post('/family/invite', { email });
    return { message: res?.message ?? `Đã gửi lời mời tới ${email}` };
  }

  /**
   * POST /family/accept - chấp nhận lời mời bằng token từ email.
   *
   * Endpoint `@Public()` - không cần token nhưng vẫn gửi Bearer (BE đọc được
   * token nếu guard cho phép). `skipAuth` KHÔNG set vì `ApiClient` gắn Bearer
   * mặc định và BE cần userId khi đã đăng nhập (sau khi BE sửa bug).
   *
   * @param {string} token - token trong link email mời.
   */
  async acceptInvite(token) {
    const res = await ApiClient.post('/family/accept', { token });
    return { message: res?.message ?? 'Đã tham gia gia đình thành công!' };
  }

  /**
   * POST /family/reject - từ chối lời mời bằng token.
   *
   * @param {string} token - token trong link email mời.
   */
  async rejectInvite(token) {
    const res = await ApiClient.post('/family/reject', { token });
    return { message: res?.message ?? 'Đã từ chối lời mời' };
  }

  /**
   * DELETE /family/members/:memberId - xoá thành viên (owner only).
   *
   * @param {string} memberId - ID bản ghi FamilyMember.
   */
  async removeMember(memberId) {
    const res = await ApiClient.delete(`/family/members/${memberId}`);
    return { message: res?.message ?? 'Đã xoá thành viên' };
  }

  /**
   * DELETE /family/groups - giải tán gia đình (owner only).
   *
   * KHÔNG có endpoint "rời nhóm" cho member - BE chỉ cho owner xoá member
   * (`family.service.ts:264-266`). => UI member không có nút rời nhóm.
   */
  async dissolveGroup() {
    const res = await ApiClient.delete('/family/groups');
    return { message: res?.message ?? 'Đã giải tán gia đình' };
  }
}
