/**
 * appConfig - getImageUrl / getServerBaseUrl / getFileBaseUrl
 * Theo P0.7: 2 test cho appConfig
 */

import { getServerBaseUrl, getFileBaseUrl, getImageUrl } from '../appConfig';

describe('getImageUrl', () => {
  it('trả null khi url rỗng / null / undefined / chuỗi "null"', () => {
    expect(getImageUrl(null)).toBeNull();
    expect(getImageUrl(undefined)).toBeNull();
    expect(getImageUrl('')).toBeNull();
    expect(getImageUrl('   ')).toBeNull();
    expect(getImageUrl('null')).toBeNull();
  });

  it('trả nguyên url nếu đã là absolute (http/https)', () => {
    expect(getImageUrl('https://cdn.example.com/a.jpg')).toBe('https://cdn.example.com/a.jpg');
    expect(getImageUrl('http://cdn.example.com/a.jpg')).toBe('http://cdn.example.com/a.jpg');
  });

  it('ghép fileBaseUrl cho url relative, tự thêm dấu /', () => {
    // base là production -> file host
    expect(getImageUrl('uploads/a.jpg')).toBe('https://file.friggy.io.vn/uploads/a.jpg');
    expect(getImageUrl('/uploads/a.jpg')).toBe('https://file.friggy.io.vn/uploads/a.jpg');
  });

  it('đổi api host sang file host khi BE trả nhầm host', () => {
    expect(getImageUrl('https://api.friggy.io.vn/uploads/a.jpg')).toBe(
      'https://file.friggy.io.vn/uploads/a.jpg'
    );
  });

  it('tự thêm https cho url bắt đầu bằng file host không protocol', () => {
    expect(getImageUrl('file.friggy.io.vn/uploads/a.jpg')).toBe(
      'https://file.friggy.io.vn/uploads/a.jpg'
    );
  });
});

describe('getServerBaseUrl', () => {
  it('cắt /api/v1 ở cuối', () => {
    expect(getServerBaseUrl()).toBe('https://api.friggy.io.vn');
  });
});

describe('getFileBaseUrl', () => {
  it('trả file host khi base URL là api.friggy.io.vn', () => {
    expect(getFileBaseUrl()).toBe('https://file.friggy.io.vn');
  });
});
