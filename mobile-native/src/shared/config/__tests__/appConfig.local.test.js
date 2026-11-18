/**
 * appConfig — hành vi ở chế độ LOCAL/LAN (dev).
 *
 * ⚠️ Bối cảnh:
 *   BE serve static assets ở ROOT (`app.useStaticAssets(public)` được gọi
 *   TRƯỚC `app.setGlobalPrefix('api')`) -> file tĩnh nằm ở `/avatars/x.jpg`,
 *   KHÔNG phải `/api/v1/avatars/x.jpg`.
 *
 *   Ngoài ra `.env` của mobile có thể còn `EXPO_PUBLIC_FILE_BASE_URL` trỏ
 *   tới tunnel ngrok đã hết hạn -> ảnh hỏng trong khi API vẫn chạy.
 *   => Khi API trỏ về local/LAN, file base URL phải suy ra từ API base URL.
 */

describe('appConfig — chế độ local/LAN', () => {
  const OLD_ENV = { ...process.env };

  afterEach(() => {
    process.env = { ...OLD_ENV };
    jest.resetModules();
  });

  const loadWith = (env) => {
    Object.assign(process.env, env);
    jest.resetModules();
    return require('../appConfig');
  };

  it('LAN: file base URL lấy từ server base URL, bỏ qua override ngrok chết', () => {
    const cfg = loadWith({
      EXPO_PUBLIC_API_BASE_URL: 'http://192.168.1.50:6969/api/v1',
      EXPO_PUBLIC_FILE_BASE_URL: 'https://expired.ngrok-free.dev',
    });
    expect(cfg.getServerBaseUrl()).toBe('http://192.168.1.50:6969');
    expect(cfg.getFileBaseUrl()).toBe('http://192.168.1.50:6969');
  });

  it('localhost: file base URL = server base URL', () => {
    const cfg = loadWith({
      EXPO_PUBLIC_API_BASE_URL: 'http://localhost:6969/api/v1',
      EXPO_PUBLIC_FILE_BASE_URL: '',
    });
    expect(cfg.getFileBaseUrl()).toBe('http://localhost:6969');
  });

  it('emulator Android (10.0.2.2) cũng được coi là local', () => {
    const cfg = loadWith({
      EXPO_PUBLIC_API_BASE_URL: 'http://10.0.2.2:6969/api/v1',
      EXPO_PUBLIC_FILE_BASE_URL: '',
    });
    expect(cfg.getFileBaseUrl()).toBe('http://10.0.2.2:6969');
  });

  it('LAN: path tĩnh không có prefix /api/v1', () => {
    const cfg = loadWith({
      EXPO_PUBLIC_API_BASE_URL: 'http://192.168.1.50:6969/api/v1',
      EXPO_PUBLIC_FILE_BASE_URL: '',
    });
    expect(cfg.getImageUrl('/avatars/abc.jpg')).toBe('http://192.168.1.50:6969/avatars/abc.jpg');
  });

  it('LAN: bỏ prefix /public/ cũ do seed SQL lưu', () => {
    const cfg = loadWith({
      EXPO_PUBLIC_API_BASE_URL: 'http://192.168.1.50:6969/api/v1',
      EXPO_PUBLIC_FILE_BASE_URL: '',
    });
    expect(cfg.getImageUrl('/public/ingredients/rau_muong.jpg')).toBe(
      'http://192.168.1.50:6969/ingredients/rau_muong.jpg',
    );
  });

  it('offline: URI file:// giữ nguyên, KHÔNG bị prefix base URL', () => {
    const cfg = loadWith({
      EXPO_PUBLIC_API_BASE_URL: 'http://192.168.1.50:6969/api/v1',
      EXPO_PUBLIC_FILE_BASE_URL: '',
    });
    expect(cfg.getImageUrl('file:///data/user/0/com.friggy/files/img-1.jpg')).toBe(
      'file:///data/user/0/com.friggy/files/img-1.jpg',
    );
    expect(cfg.getImageUrl('content://media/external/images/1')).toBe(
      'content://media/external/images/1',
    );
    expect(cfg.getImageUrl('ph://ABC123')).toBe('ph://ABC123');
    expect(cfg.getImageUrl('data:image/png;base64,AAA')).toBe('data:image/png;base64,AAA');
  });

  it('production: giữ nguyên hành vi cũ (giữ prefix /public/)', () => {
    const cfg = loadWith({
      EXPO_PUBLIC_API_BASE_URL: 'https://api.friggy.io.vn/api/v1',
      EXPO_PUBLIC_FILE_BASE_URL: '',
    });
    expect(cfg.getFileBaseUrl()).toBe('https://file.friggy.io.vn');
    expect(cfg.getImageUrl('/public/recipes/trung-xao.jpg')).toBe(
      'https://file.friggy.io.vn/public/recipes/trung-xao.jpg',
    );
  });

  it('ngrok/staging (BE Express) -> bỏ prefix /public/ vì serve ở ROOT', () => {
    // BE (Express) serve `public/` ở ROOT ở MỌI môi trường dev, kể cả khi
    // expose qua ngrok -> `/public/x.jpg` luôn 404.
    const cfg = loadWith({
      EXPO_PUBLIC_API_BASE_URL: 'https://abc-def.ngrok-free.dev/api/v1',
      EXPO_PUBLIC_FILE_BASE_URL: 'https://abc-def.ngrok-free.dev',
    });
    expect(cfg.getFileBaseUrl()).toBe('https://abc-def.ngrok-free.dev');
    expect(cfg.getImageUrl('/public/ingredients/rau_muong.jpg')).toBe(
      'https://abc-def.ngrok-free.dev/ingredients/rau_muong.jpg',
    );
    expect(cfg.getImageUrl('/avatars/abc.jpg')).toBe(
      'https://abc-def.ngrok-free.dev/avatars/abc.jpg',
    );
  });

  it('production: override file base URL vẫn được tôn trọng', () => {
    const cfg = loadWith({
      EXPO_PUBLIC_API_BASE_URL: 'https://api.friggy.io.vn/api/v1',
      EXPO_PUBLIC_FILE_BASE_URL: 'https://cdn.friggy.io.vn/',
    });
    expect(cfg.getFileBaseUrl()).toBe('https://cdn.friggy.io.vn');
  });

  it('base URL có trailing slash vẫn cắt /api/v1 đúng', () => {
    const cfg = loadWith({
      EXPO_PUBLIC_API_BASE_URL: 'http://localhost:6969/api/v1/',
      EXPO_PUBLIC_FILE_BASE_URL: '',
    });
    expect(cfg.getServerBaseUrl()).toBe('http://localhost:6969');
  });
});
