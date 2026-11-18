/**
 * localImageStore - copy ảnh vào thư mục persistent của app.
 *
 * ⚠️ VÌ SAO CẦN:
 *   `expo-image-picker` trả URI trong CACHE của OS -> OS có thể xoá bất cứ
 *   lúc nào. Nếu offline, ảnh đã vào hàng đợi mà file cache biến mất ->
 *   op `AVATAR_UPLOAD` không upload được -> avatar mất trắng vĩnh viễn.
 *
 * Module này phải:
 *   - KHÔNG crash khi `expo-file-system` không có (Jest / web).
 *   - Trả lại URI gốc nếu copy thất bại (không làm hỏng luồng chính).
 */

describe('localImageStore.persistLocalImage', () => {
  const ORIGINAL_URI = 'file:///data/user/0/com.friggy/cache/ImagePicker/abc.jpeg';

  beforeEach(() => {
    jest.resetModules();
    jest.dontMock('expo-file-system');
  });

  it('trả về URI gốc khi uri rỗng', async () => {
    const { persistLocalImage } = require('../localImageStore');
    expect(await persistLocalImage(null)).toBeNull();
    expect(await persistLocalImage('')).toBe('');
  });

  it('copy sang thư mục persistent và trả về URI mới', async () => {
    const copy = jest.fn(async (dest) => {
      // Mô phỏng `File.copy()` của expo-file-system.
      dest.uri = 'file:///data/user/0/com.friggy/files/friggy-images/img-1.jpeg';
    });
    const create = jest.fn();

    jest.doMock('expo-file-system', () => ({
      Directory: class {
        constructor(...args) {
          this.args = args;
          this.exists = true;
        }

        create() {
          create();
        }
      },
      File: class {
        constructor(base, name) {
          if (typeof base === 'string') {
            this.uri = base;
          } else {
            this.uri = `${base.uri}/${name}`;
          }
        }

        async copy(dest) {
          await copy(dest);
        }
      },
      Paths: { document: 'file:///data/user/0/com.friggy/files' },
    }));

    const { persistLocalImage } = require('../localImageStore');
    const result = await persistLocalImage(ORIGINAL_URI);

    expect(result).toBe('file:///data/user/0/com.friggy/files/friggy-images/img-1.jpeg');
    expect(result).not.toBe(ORIGINAL_URI);
    expect(copy).toHaveBeenCalledTimes(1);
  });

  it('copy thất bại -> trả lại URI gốc (không crash)', async () => {
    jest.doMock('expo-file-system', () => ({
      Directory: class {
        constructor() {
          this.exists = true;
        }

        create() {}
      },
      File: class {
        constructor(base) {
          this.uri = typeof base === 'string' ? base : `${base.uri}/x.jpg`;
        }

        async copy() {
          throw new Error('EACCES');
        }
      },
      Paths: { document: 'file:///data/user/0/com.friggy/files' },
    }));

    const { persistLocalImage } = require('../localImageStore');
    expect(await persistLocalImage(ORIGINAL_URI)).toBe(ORIGINAL_URI);
  });

  it('không có expo-file-system -> trả lại URI gốc', async () => {
    jest.doMock('expo-file-system', () => {
      throw new Error('Cannot find module');
    });

    const { persistLocalImage } = require('../localImageStore');
    expect(await persistLocalImage(ORIGINAL_URI)).toBe(ORIGINAL_URI);
  });
});
