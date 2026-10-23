/**
 * RealFamilyService - test mapper BE -> shape UI + payload -> BE.
 *
 * Sprint A3. Theo R1 (mục 9b.4 của plan): mỗi Real*Service PHẢI có test chứng
 * minh mapper cho ra đúng shape và lỗi được map đúng.
 *
 * Trọng tâm của A3 là SỰ LỆCH SHAPE giữa BE và UI:
 *   - BE `FamilyRoleDto` = `{ role, group }` — mock RN KHÔNG có `role`!
 *   - BE `FamilyMemberDto` dùng `memberName`/`memberAvatar`/`invitedEmail`
 *   - BE `group.members` KHÔNG bao gồm owner
 *   - BE KHÔNG có field `inviteCode` (mock RN có)
 */

jest.mock('../../../api/ApiClient', () => ({
  ApiClient: {
    post: jest.fn(),
    get: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    uploadFile: jest.fn(),
  },
  onApiEvent: jest.fn(),
}));

// eslint-disable-next-line import/first
import { ApiClient } from '../../../api/ApiClient';
// eslint-disable-next-line import/first
import { RealFamilyService } from '../RealFamilyService';

/** `FamilyMemberDto` — đúng 8 field BE trả về. */
const beMember = (overrides = {}) => ({
  id: 'mem-1',
  invitedEmail: 'hoa@example.com',
  memberName: 'Nguyễn Thị Hoa',
  memberAvatar: null,
  status: 'active',
  invitedAt: '2026-09-20T00:00:00.000Z',
  joinedAt: '2026-09-21T00:00:00.000Z',
  ...overrides,
});

/** `FamilyGroupDto` — KHÔNG bao gồm owner trong `members`. */
const beGroup = (overrides = {}) => ({
  id: 'grp-1',
  status: 'active',
  owner: { id: 'u-1', name: 'Trần Quốc Lâm', avatar: null },
  members: [beMember()],
  activeCount: 1,
  maxMembers: 5,
  createdAt: '2026-09-20T00:00:00.000Z',
  ...overrides,
});

let service;

beforeEach(() => {
  jest.clearAllMocks();
  service = new RealFamilyService();
});

// ═══════════════ GET /family/me ═══════════════

describe('RealFamilyService - getFamily', () => {
  it('gọi GET /family/me và map `role` + `group`', async () => {
    ApiClient.get.mockResolvedValue({ role: 'owner', group: beGroup() });

    const family = await service.getFamily();

    expect(ApiClient.get).toHaveBeenCalledWith('/family/me');
    expect(family.role).toBe('owner');
    expect(family.groupId).toBe('grp-1');
    expect(family.activeCount).toBe(1);
    expect(family.maxMembers).toBe(5);
    expect(family.owner.name).toBe('Trần Quốc Lâm');
  });

  it('`role: none` + `group: null` -> shape rỗng, UI hiện empty state', async () => {
    ApiClient.get.mockResolvedValue({ role: 'none', group: null });

    const family = await service.getFamily();

    expect(family.role).toBe('none');
    expect(family.members).toEqual([]);
    expect(family.owner).toBeNull();
    expect(family.groupId).toBeNull();
  });

  it('member chưa đăng ký (memberName null) -> fallback về email', async () => {
    ApiClient.get.mockResolvedValue({
      role: 'owner',
      group: beGroup({ members: [beMember({ memberName: null })] }),
    });

    const family = await service.getFamily();

    expect(family.members[0].name).toBe('hoa@example.com');
  });

  it('BE trả null -> trả shape an toàn, không crash', async () => {
    ApiClient.get.mockResolvedValue(null);

    const family = await service.getFamily();

    expect(family.role).toBe('none');
    expect(family.members).toEqual([]);
  });
});

// ═══════════════ Invite ═══════════════

describe('RealFamilyService - inviteMember', () => {
  it('gửi `{ email }` lên BE', async () => {
    ApiClient.post.mockResolvedValue({ message: 'Đã gửi lời mời đến hoa@example.com' });

    await service.inviteMember('hoa@example.com');

    const [url, payload] = ApiClient.post.mock.calls[0];
    expect(url).toBe('/family/invite');
    expect(payload).toEqual({ email: 'hoa@example.com' });
  });

  it('BE trả chỉ `{ message }` -> lấy message, KHÔNG đợi danh sách member', async () => {
    ApiClient.post.mockResolvedValue({ message: 'Đã gửi lời mời đến hoa@example.com' });

    const res = await service.inviteMember('hoa@example.com');

    expect(res.message).toBe('Đã gửi lời mời đến hoa@example.com');
  });
});

// ═══════════════ Accept / Reject (token từ email) ═══════════════

describe('RealFamilyService - acceptInvite / rejectInvite', () => {
  it('accept gửi `{ token }` lên BE', async () => {
    ApiClient.post.mockResolvedValue({ message: 'Đã tham gia gia đình thành công!' });

    await service.acceptInvite('uuid-token-123');

    const [url, payload] = ApiClient.post.mock.calls[0];
    expect(url).toBe('/family/accept');
    expect(payload).toEqual({ token: 'uuid-token-123' });
  });

  it('reject gửi `{ token }` lên BE', async () => {
    ApiClient.post.mockResolvedValue({ message: 'Đã từ chối lời mời' });

    await service.rejectInvite('uuid-token-123');

    const [url, payload] = ApiClient.post.mock.calls[0];
    expect(url).toBe('/family/reject');
    expect(payload).toEqual({ token: 'uuid-token-123' });
  });
});

// ═══════════════ Remove member / Dissolve ═══════════════

describe('RealFamilyService - removeMember / dissolveGroup', () => {
  it('removeMember gọi DELETE đúng path có memberId', async () => {
    ApiClient.delete.mockResolvedValue({ message: 'Đã xóa thành viên' });

    await service.removeMember('mem-1');

    expect(ApiClient.delete).toHaveBeenCalledWith('/family/members/mem-1');
  });

  it('dissolveGroup gọi DELETE /family/groups', async () => {
    ApiClient.delete.mockResolvedValue({ message: 'Đã giải tán gia đình' });

    await service.dissolveGroup();

    expect(ApiClient.delete).toHaveBeenCalledWith('/family/groups');
  });
});
