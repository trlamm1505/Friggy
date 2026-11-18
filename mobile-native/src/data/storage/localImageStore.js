/**
 * localImageStore - lưu ảnh người dùng chọn vào thư mục PERSISTENT của app.
 *
 * ⚠️ VÌ SAO CẦN:
 *   `expo-image-picker` trả về URI trong thư mục CACHE của OS
 *   (vd: `file:///data/user/0/.../cache/ImagePicker/xxx.jpeg`).
 *   OS có thể XOÁ file cache bất cứ lúc nào -> ảnh avatar offline sẽ mất,
 *   và file đã lưu trong hàng đợi đồng bộ cũng không upload được nữa.
 *
 *   -> Copy sang `Paths.document` (bền vững, chỉ bị xoá khi user gỡ app).
 *   Đối chiếu Flutter: `path_provider` + `File.copy` vào app documents dir.
 *
 * ⚠️ `expo-file-system` KHÔNG khai báo trong `package.json` cũng chạy được vì
 *   `expo` đã kéo theo nó, nhưng ta require() trong try/catch để:
 *   - không làm vỡ Jest (native module không chạy được trong Node),
 *   - fallback về URI gốc nếu copy thất bại.
 */

let fsModule;
let fsResolved = false;

/** Lấy module `expo-file-system` (lazy + an toàn). */
const getFs = () => {
  if (fsResolved) return fsModule;
  fsResolved = true;
  try {
    fsModule = require('expo-file-system');
  } catch (_e) {
    fsModule = null;
  }
  return fsModule;
};

/** Lấy extension từ URI (mặc định `.jpg`). */
const getExtension = (uri) => {
  const clean = String(uri).split('?')[0];
  const match = /\.(jpe?g|png|webp|heic|heif)$/i.exec(clean);
  return match ? match[0].toLowerCase() : '.jpg';
};

/**
 * Copy ảnh vào thư mục persistent của app.
 *
 * @param {string} uri - URI ảnh gốc từ ImagePicker
 * @returns {Promise<string>} URI persistent (nếu lỗi -> trả lại URI gốc)
 */
export const persistLocalImage = async (uri) => {
  if (!uri) return uri;

  const fs = getFs();
  if (!fs) return uri;

  try {
    const { Directory, File, Paths } = fs;

    const dir = new Directory(Paths.document, 'friggy-images');
    if (!dir.exists) {
      dir.create({ intermediates: true, idempotent: true });
    }

    const name = `img-${Date.now()}-${Math.floor(Math.random() * 1e6)}${getExtension(uri)}`;
    const dest = new File(dir, name);
    await new File(uri).copy(dest);

    return dest.uri;
  } catch (_e) {
    // Copy thất bại (URI không hợp lệ, hết quyền...) -> dùng URI gốc.
    return uri;
  }
};

export default persistLocalImage;
