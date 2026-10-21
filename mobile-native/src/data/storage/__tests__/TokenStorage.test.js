/**
 * TokenStorage - 6 storage keys + clearAll + expiry động
 * Theo P0.7: 2 test cho TokenStorage
 */

import { TokenStorage } from '../TokenStorage';

describe('TokenStorage - storage keys', () => {
  beforeEach(() => {
    TokenStorage.clearAll();
  });

  it('dùng đúng 4 key gốc giống Flutter', () => {
    expect(TokenStorage.KEYS.ACCESS_TOKEN).toBe('access_token');
    expect(TokenStorage.KEYS.REFRESH_TOKEN).toBe('refresh_token');
    expect(TokenStorage.KEYS.USER_ID).toBe('user_id');
    expect(TokenStorage.KEYS.USER_DATA).toBe('user_data');
  });

  it('lưu/đọc userData dạng object, trả null khi rỗng', () => {
    expect(TokenStorage.getUserData()).toBeNull();

    const user = { id: 'u1', name: 'Lâm', avatar: null };
    TokenStorage.setUserData(user);
    expect(TokenStorage.getUserData()).toEqual(user);

    TokenStorage.setUserData(null);
    expect(TokenStorage.getUserData()).toBeNull();
  });

  it('lưu/đọc userId, stringify số về string', () => {
    TokenStorage.setUserId(123);
    expect(TokenStorage.getUserId()).toBe('123');
  });
});

describe('TokenStorage - isLoggedIn', () => {
  beforeEach(() => {
    TokenStorage.clearAll();
  });

  it('chỉ true khi access_token có và không rỗng (giống Flutter)', () => {
    expect(TokenStorage.isLoggedIn()).toBe(false);

    TokenStorage.setAccessToken('');
    expect(TokenStorage.isLoggedIn()).toBe(false);

    TokenStorage.setAccessToken('abc');
    expect(TokenStorage.isLoggedIn()).toBe(true);
  });
});

describe('TokenStorage - clearAll xóa cả 6 keys', () => {
  beforeEach(() => {
    TokenStorage.clearAll();
  });

  it('xóa sạch 6 keys trong 1 lần', () => {
    TokenStorage.setAccessToken('a');
    TokenStorage.setRefreshToken('r');
    TokenStorage.setUserId('u');
    TokenStorage.setUserData({ id: 'u' });
    TokenStorage.setTokenExpiry({ accessExpiresAt: 111, refreshExpiresAt: 222 });

    TokenStorage.clearAll();

    expect(TokenStorage.getAccessToken()).toBeNull();
    expect(TokenStorage.getRefreshToken()).toBeNull();
    expect(TokenStorage.getUserId()).toBeNull();
    expect(TokenStorage.getUserData()).toBeNull();
    expect(TokenStorage.getAccessExpiresAt()).toBeNull();
    expect(TokenStorage.getRefreshExpiresAt()).toBeNull();
  });
});

describe('TokenStorage - expiry động (BẮT BUỘC 7)', () => {
  beforeEach(() => {
    TokenStorage.clearAll();
  });

  it('chưa có thông tin hết hạn -> coi như CHƯA hết hạn (app vẫn chạy)', () => {
    expect(TokenStorage.getAccessExpiresAt()).toBeNull();
    expect(TokenStorage.isAccessTokenExpired()).toBe(false);
    expect(TokenStorage.getRefreshExpiresAt()).toBeNull();
    expect(TokenStorage.isRefreshTokenExpired()).toBe(false);
  });

  it('token còn hạn -> false', () => {
    TokenStorage.setTokenExpiry({
      accessExpiresAt: Date.now() + 10 * 60 * 1000,
      refreshExpiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    });
    expect(TokenStorage.isAccessTokenExpired()).toBe(false);
    expect(TokenStorage.isRefreshTokenExpired()).toBe(false);
  });

  it('token đã hết hạn -> true', () => {
    TokenStorage.setTokenExpiry({
      accessExpiresAt: Date.now() - 1000,
      refreshExpiresAt: Date.now() - 1000,
    });
    expect(TokenStorage.isAccessTokenExpired()).toBe(true);
    expect(TokenStorage.isRefreshTokenExpired()).toBe(true);
  });

  it('có buffer 60s: còn 30s thì coi như đã hết hạn (tránh hết hạn giữa chừng)', () => {
    TokenStorage.setTokenExpiry({ accessExpiresAt: Date.now() + 30 * 1000 });
    expect(TokenStorage.isAccessTokenExpired()).toBe(true);
  });

  it('không hardcode TTL 7 ngày - nhận mốc bất kỳ do BE trả', () => {
    // BE admin đổi refreshTtl xuống 1 giờ
    TokenStorage.setTokenExpiry({ refreshExpiresAt: Date.now() + 60 * 60 * 1000 });
    expect(TokenStorage.isRefreshTokenExpired()).toBe(false);

    // BE admin đổi xuống 10 phút
    TokenStorage.setTokenExpiry({ refreshExpiresAt: Date.now() + 10 * 60 * 1000 });
    expect(TokenStorage.isRefreshTokenExpired()).toBe(false);

    // BE admin đổi xuống 30 giây -> đã qua buffer -> hết hạn
    TokenStorage.setTokenExpiry({ refreshExpiresAt: Date.now() + 30 * 1000 });
    expect(TokenStorage.isRefreshTokenExpired()).toBe(true);
  });
});
