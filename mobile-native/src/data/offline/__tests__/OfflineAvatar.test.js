/**
 * OfflineAvatar - hồi quy luồng đổi ảnh đại diện khi OFFLINE (F1).
 *
 * Bối cảnh (bug user báo): "update ảnh đại diện, tôi test đều không hiển thị
 * được cả offline lẫn online".
 *
 * Luồng offline đúng phải là:
 *   1. User chọn ảnh -> file được copy vào thư mục PERSISTENT của app
 *      (`persistLocalImage`) vì URI của ImagePicker nằm trong cache của OS
 *      và có thể bị xoá -> op trong hàng đợi sẽ không upload được nữa.
 *   2. `SafeService` bắt lỗi mạng -> `MutationHandlers.userService.uploadAvatar`
 *      ghi `avatar_local_path` + `avatar_url` (bằng chính URI local) vào cache
 *      -> đẩy op `AVATAR_UPLOAD` vào hàng đợi -> ném `OfflineQueuedError`.
 *   3. UI bắt `isOfflineQueued` -> set `avatarUrl` = URI local (KHÔNG báo lỗi đỏ).
 *   4. Khi có mạng lại, `SyncEngine` upload op -> `setAvatarLocal('', urlFromServer)`
 *      -> cache giờ trỏ về URL server.
 */

import { queueMutation } from '../OfflineMutationQueue';
import { OP_TYPES } from '../OutboxQueue';
import { offlineCache } from '../OfflineCache';
import { __resetFakeDb } from './helpers/fakeSqlite';

const clearAll = async () => {
  __resetFakeDb();
  await offlineCache.clearCache();
  const { outboxQueue } = require('../OutboxQueue');
  await outboxQueue.clear();
};

const LOCAL_URI = 'file:///data/user/0/com.friggy/files/friggy-images/img-123.jpg';

describe('OfflineAvatar - upload avatar offline', () => {
  beforeEach(clearAll);

  it('queue: lưu local path + đẩy op AVATAR_UPLOAD vào hàng đợi', async () => {
    const handled = await queueMutation('userService', 'uploadAvatar', [LOCAL_URI]);

    expect(handled).toBe(true);

    // Cache giữ URI local để UI hiện ảnh NGAY (file còn trên máy).
    const profile = await offlineCache.getUserProfile();
    expect(profile.avatarLocalPath).toBe(LOCAL_URI);
    expect(profile.avatar).toBe(LOCAL_URI);

    const { outboxQueue } = require('../OutboxQueue');
    const ops = await outboxQueue.list();
    expect(ops).toHaveLength(1);
    expect(ops[0].op_type).toBe(OP_TYPES.AVATAR_UPLOAD);
    expect(ops[0].entity_id).toBe('me');
    expect(ops[0].payload.localUri).toBe(LOCAL_URI);
  });

  it('không có URI -> KHÔNG queue (tránh op vô nghĩa)', async () => {
    const handled = await queueMutation('userService', 'uploadAvatar', [null]);
    expect(handled).toBe(false);

    const { outboxQueue } = require('../OutboxQueue');
    expect(await outboxQueue.count()).toBe(0);
  });

  it('saveUserProfile từ server KHÔNG xoá local path đang chờ đồng bộ', async () => {
    // Offline: user đã chọn ảnh -> cache có local path.
    await queueMutation('userService', 'uploadAvatar', [LOCAL_URI]);

    // User mở app lại khi đã có mạng (nhưng op chưa sync xong) -> `getProfile()`
    // gọi `saveUserProfile()` với dữ liệu server.
    // ⚠️ Nếu ghi đè `avatar_local_path = null` thì file local bị mất ->
    //    op `AVATAR_UPLOAD` trong hàng đợi không còn file để upload.
    await offlineCache.saveUserProfile({
      name: 'Test User',
      email: 'a@b.com',
      avatar: 'https://file.friggy.io.vn/avatars/old.jpg',
    });

    const profile = await offlineCache.getUserProfile();
    expect(profile.avatarLocalPath).toBe(LOCAL_URI);
    expect(profile.name).toBe('Test User');
  });

  it('saveUserProfile với avatarLocalPath=null -> xoá local path (đã sync xong)', async () => {
    await queueMutation('userService', 'uploadAvatar', [LOCAL_URI]);

    await offlineCache.saveUserProfile({
      name: 'Test User',
      email: 'a@b.com',
      avatar: 'https://file.friggy.io.vn/avatars/new.jpg',
      avatarLocalPath: null,
    });

    const profile = await offlineCache.getUserProfile();
    expect(profile.avatarLocalPath).toBeNull();
    expect(profile.avatar).toBe('https://file.friggy.io.vn/avatars/new.jpg');
  });

  it('sau khi sync xong: setAvatarLocal("", url) xoá local path', async () => {
    await queueMutation('userService', 'uploadAvatar', [LOCAL_URI]);

    // SyncEngine sau khi upload thành công gọi `setAvatarLocal('', serverUrl)`.
    await offlineCache.setAvatarLocal('', 'https://file.friggy.io.vn/avatars/new.jpg');

    const profile = await offlineCache.getUserProfile();
    expect(profile.avatarLocalPath).toBeNull();
    expect(profile.avatar).toBe('https://file.friggy.io.vn/avatars/new.jpg');
  });

  it('queue 2 lần -> hàng đợi giữ op mới nhất với URI mới nhất', async () => {
    const newer = 'file:///data/user/0/com.friggy/files/friggy-images/img-999.jpg';

    await queueMutation('userService', 'uploadAvatar', [LOCAL_URI]);
    await queueMutation('userService', 'uploadAvatar', [newer]);

    const { outboxQueue } = require('../OutboxQueue');
    const ops = await outboxQueue.list();
    const avatarOps = ops.filter((op) => op.op_type === OP_TYPES.AVATAR_UPLOAD);
    expect(avatarOps).toHaveLength(1);
    expect(avatarOps[0].payload.localUri).toBe(newer);

    const profile = await offlineCache.getUserProfile();
    expect(profile.avatarLocalPath).toBe(newer);
  });
});
