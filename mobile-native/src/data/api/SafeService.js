/**
 * SafeService - lớp bảo vệ chống "demo block".
 *
 * Vấn đề (P0.6b): ServiceRegistry chỉ fallback mock khi real service CHƯA TỒN TẠI.
 * Nhưng trong 1 sprint, real service có thể ĐÃ tồn tại mà API vẫn lỗi:
 *   - BE chưa deploy endpoint mới
 *   - Endpoint trả 500
 *   - Token hết hạn / mạng offline
 *
 * => withFallback bọc mọi method của real service trong try/catch:
 *      thành công -> dữ liệu thật
 *      lỗi 5xx / network -> trả fallback của Mock, app vẫn chạy
 *      lỗi 4xx -> NEM LÊN, vì đó là lỗi của user, giấu bằng dữ liệu giả là nói dối
 *
 * QUY TẮC BẮT BUỘC:
 *  1. CHỈ fallback khi lỗi network hoặc 5xx.
 *     BE trả data rỗng là trạng thái hợp lệ -> phải hiện EmptyState (P0.6c), KHÔNG fallback.
 *  2. Lỗi 4xx (401/403/422...) KHÔNG fallback.
 *     - 401: ApiClient đã xử lý refresh / session-expired (BẮT BUỘC 6)
 *     - 4xx khác: throw nguyên cho UI form hiển thị
 *     - 408 / 429: timeout / rate-limit -> coi như lỗi tạm thời, KHÔNG fallback
 *       (nếu fallback, user sẽ thấy dữ liệu giả và tưởng mọi thứ ổn trong khi
 *        thực tế app đang bị chặn rate)
 *  3. Log bằng console.warn kèm label để debug. TUYỆT ĐỐI KHÔNG log dữ liệu nhạy
 *     (token, password, email) - chỉ log tên method + message.
 *  4. appConfig.OFFLINE_ENABLED=false để tắt HOÀN TOÀN tầng offline (debug lỗi thật).
 *
 * ⚠️ P1 (OFFLINE) - THỨ TỰ ƯU TIÊN 4 TẦNG:
 *   Trước: real -> (lỗi network/5xx) -> MOCK.
 *   Nay:   real -> (lỗi network) -> [GHI: lưu hàng đợi offline]
 *                    -> [ĐỌC: cache local] -> (cache rỗng) -> LỖI THẬT.
 *
 *   VÌ SAO CẦN CACHE Ở GIỮA:
 *     MOCK là dữ liệu GIẢ (món ảo, tủ ảo). Khi offline, hiện mock khiến user
 *     tưởng tủ lạnh của họ chứa món không có thật -> nguy hiểm hơn cả lỗi.
 *     Cache local chứa dữ liệu THẬT đã tải về trước đó -> đúng như Flutter.
 *
 * ⚠️ OPTION C - APP KHÔNG BAO GIỜ TRẢ DỮ LIỆU GIẢ (mặc định):
 *   `allowMockData` (mặc định `false`) kiểm soát việc trả DỮ LIỆU mock.
 *   Khi tắt: mọi tình huống hết đường -> NÉM LỖI THẬT lên UI (UI hiện ErrorState).
 *   Mock vẫn được giữ trong bundle vì 2 việc KHÁC:
 *     1. `collectNames(mockService)` -> dựng proxy đúng contract của interface
 *        (bỏ mock -> proxy mất method -> UI gọi ra "undefined is not a function").
 *     2. Chế độ demo `EXPO_PUBLIC_USE_MOCKS=true`.
 *
 * ⚠️ CHÍNH SÁCH LỖI GHI (Option B) - xem `WriteMethods.js`:
 *   - GHI + lỗi 5xx    -> ném lỗi thật (KHÔNG mock, KHÔNG queue).
 *   - GHI + lỗi network -> có mutation handler? -> queue + `OfflineQueuedError`
 *                          không có handler?      -> `OfflineRequiresNetworkError`.
 *   - ĐỌC + lỗi network -> cache local -> cache rỗng -> ném lỗi thật.
 *
 *   `cacheFallback` là hàm BẤT ĐỒNG BỘ trả về dữ liệu cache cho 1 method.
 *   Nếu không truyền `cacheFallback` -> hành vi cũ (real -> mock) giữ nguyên.
 *
 *   `mutationHandler` là hàm lưu thao tác GHI offline. Nó chỉ chạy với lỗi
 *   NETWORK (server chưa nhận yêu cầu). Lỗi 4xx/5xx -> không queue.
 */

import { OfflineQueuedError } from '../offline/OfflineQueuedError';
import { OfflineRequiresNetworkError } from '../offline/OfflineRequiresNetworkError';
import { isWriteMethod } from './WriteMethods';

/**
 * Trích status code từ nhiều hình dạng lỗi khác nhau.
 *
 * ApiException (P0.3) dùng `statusCode`.
 * AxiosError dùng `response.status`.
 * Một số service có thể tự throw `{ status: 500 }`.
 *
 * @param {any} e - error object
 * @returns {number|null}
 */
export const extractStatus = (e) => {
  if (!e) return null;
  // ApiException
  if (typeof e.statusCode === 'number') return e.statusCode;
  // AxiosError
  if (typeof e.response?.status === 'number') return e.response.status;
  // Service tự throw dạng { status }
  if (typeof e.status === 'number') return e.status;
  return null;
};

/**
 * Có phải lỗi network (offline, DNS fail, timeout kết nối) không.
 * ApiException đánh dấu bằng cờ isNetworkError.
 *
 * @param {any} e
 * @returns {boolean}
 */
export const isNetworkError = (e) => {
  if (!e) return false;
  if (e.isNetworkError === true) return true;
  // Axios không có response = không gọi tới server được
  if (e.response === undefined && typeof e.message === 'string') {
    return /network|timeout|ECONN|ENOTFOUND|ETIMEDOUT|offline/i.test(e.message);
  }
  return false;
};

/**
 * Lỗi có được phép fallback sang mock không?
 *
 * @param {any} e
 * @returns {boolean} true = nên fallback
 */
export const shouldFallback = (e) => {
  const status = extractStatus(e);

  // Không xác định được status + là network error -> fallback (offline)
  if (status === null) {
    return isNetworkError(e);
  }

  // 5xx -> lỗi server -> fallback cho app vẫn dùng được
  if (status >= 500) return true;

  // 4xx -> lỗi của user / chính sách -> KHÔNG fallback
  // (gồm cả 401, 403, 408, 422, 429 - tất cả đều phải ném lên)
  if (status >= 400) return false;

  // 3xx hoặc lỗi lạ (status không hợp lệ) -> coi như network, fallback
  if (isNetworkError(e)) return true;

  return false;
};

/**
 * Bọc 1 real service: mọi method gọi real trước, lỗi thì đi theo chính sách
 * 4 tầng (cache offline -> queue offline -> lỗi thật -> mock CHỈ KHI được bật).
 *
 * @param {object} realService - instance Real*Service
 * @param {object} mockService - instance Mock*Service (cung ciem prototype + contract)
 * @param {object} [options]
 * @param {string} [options.label] - tên để log, vd 'fridge'
 * @param {boolean} [options.offlineEnabled]
 *        - mặc định `true`. Bật TẦNG OFFLINE: `cacheFallback` + `mutationHandler`.
 *        ⚠️ CỜ NÀY ĐỘC LẬP VỚI `allowMockData`:
 *          offline bật + mock tắt là trạng thái ĐÚNG cho production.
 * @param {boolean} [options.allowMockData]
 *        - mặc định `false`. Cho phép trả DỮ LIỆU GIẢ (mock) khi hết cache.
 *        ⚠️ Mặc định `false` vì dữ liệu giả trong app tủ lạnh NGUY HIỂM hơn lỗi:
 *          user có thể bỏ món thật trong nhà khi tưởng tủ đã có sẵn.
 * @param {string} [options.serviceKey]
 *        - key của service (vd 'fridgeService') để phân biệt method ĐỌC / GHI.
 * @param {(methodName:string, args:Array) => Promise<any>} [options.cacheFallback]
 *        - hàm đọc dữ liệu cache local khi lỗi network. Nếu trả `undefined`
 *          hoặc `null` -> coi như cache RỖNG -> tiếp tục theo chính sách.
 * @param {(methodName:string, args:Array) => Promise<any>} [options.mutationHandler]
 *        - hàm lưu thao tác ghi offline khi lỗi network (ghi cache + đẩy hàng đợi).
 *          Nếu handler xử lý được -> ném `OfflineQueuedError` để UI biết đây
 *          là "đã lưu offline" chứ không phải lỗi.
 * @returns {object} proxy có đúng các method của interface
 */
export const withFallback = (realService, mockService, options = {}) => {
  const {
    label = 'service',
    serviceKey,
    offlineEnabled = true,
    allowMockData = false,
    cacheFallback,
    mutationHandler,
  } = options;

  if (!realService) return mockService;
  if (!mockService) return realService;

  // Tắt HOÀN TOÀN proxy (offline + mock) -> trả thẳng real, không bọc.
  // Dùng khi debug lỗi thật / muốn xem hành vi gốc của BE.
  if (!offlineEnabled && !allowMockData) return realService;

  // Gom TẤT CẢ property (kể cả không phải function) từ CẢ prototype chain.
  // Mock extends I*Service nên method nằm ở prototype của lớp con, không phải
  // của chính nó - phải leo cả chain.
  // `seen` tránh duyệt trùng method của Object (toString, hasOwnProperty...).
  const collectNames = (obj) => {
    const names = new Set();
    let current = obj;
    while (current && current !== Object.prototype) {
      for (const name of Object.getOwnPropertyNames(current)) {
        if (name === 'constructor') continue;
        names.add(name);
      }
      current = Object.getPrototypeOf(current);
    }
    return Array.from(names);
  };

  /**
   * Giá trị trả về có phải ASYNC ITERABLE (async generator) không.
   *
   * @param {any} value
   * @returns {boolean}
   */
  const isAsyncIterable = (value) =>
    value != null && typeof value[Symbol.asyncIterator] === 'function';

  /**
   * Log cảnh báo fallback (chỉ tên method + message, KHÔNG log dữ liệu nhạy).
   *
   * @param {string} label
   * @param {string} name
   * @param {any} e
   */
  const logFallback = (label, name, e) => {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      const status = extractStatus(e);
      console.warn(
        `[SafeService:${label}.${name}] fallback mock (status=${status ?? 'network'}):`,
        e?.message
      );
    }
  };

  /**
   * Log khi dùng được dữ liệu cache local.
   * @param {string} label
   * @param {string} name
   */
  const logCache = (label, name) => {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.warn(`[SafeService:${label}.${name}] dùng dữ liệu cache offline`);
    }
  };

  /**
   * Trả về dữ liệu MOCK nếu được phép, ngược lại ném lỗi thật.
   *
   * ⚠️ Option C - app KHÔNG BAO GIỜ trả dữ liệu giả cho user khi
   *   `allowMockData === false` (mặc định production).
   *   => Mọi tình huống hết đường -> ném lỗi thật lên UI (UI hiện ErrorState).
   *
   * @param {string} name
   * @param {Function|null} mockFn
   * @param {Array} args
   * @param {any} e - lỗi gốc
   * @returns {any}
   */
  const fallbackToMockOrThrow = (name, mockFn, args, e) => {
    if (allowMockData && typeof mockFn === 'function') {
      logFallback(label, name, e);
      return mockFn.apply(mockService, args);
    }
    // Không có mock, hoặc mock bị cấm -> ném LỖI THẬT.
    throw e;
  };

  /**
   * Thử đọc dữ liệu cache local khi lỗi network.
   *
   * ⚠️ CHỈ dùng cache khi lỗi là NETWORK, KHÔNG dùng cho lỗi 5xx:
   *   - Lỗi network -> server không trả lời -> cache là nguồn dữ liệu DUY NHẤT.
   *   - Lỗi 5xx     -> server CÓ trả lời nhưng lỗi -> cache có thể cũ hơn
   *                    response lỗi, và người dùng cần biết server đang lỗi.
   *     => 5xx vẫn fallback sang mock như cũ (giữ nguyên hành vi cũ).
   *
   * @param {string} name - tên method
   * @param {Array} args - arguments của method
   * @returns {Promise<{hit:boolean, value?:any}>}
   */
  const tryCache = async (name, args) => {
    if (typeof cacheFallback !== 'function') return { hit: false };

    try {
      const value = await cacheFallback(name, args);
      // `undefined` / `null` = cache không có dữ liệu -> đi tiếp sang mock.
      if (value === undefined || value === null) return { hit: false };

      // Mảng rỗng = server thật cũng trả rỗng -> coi như cache KHÔNG có dữ liệu
      // (không nên hiện "0 món" giả khi cache rỗng).
      if (Array.isArray(value) && value.length === 0) return { hit: false };

      return { hit: true, value };
    } catch (e) {
      // Lỗi cache KHÔNG được làm hỏng fallback -> bỏ qua, đi tới mock.
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.warn(`[SafeService:${label}.${name}] lỗi khi đọc cache:`, e?.message);
      }
      return { hit: false };
    }
  };

  /**
   * Thử lưu thao tác ghi offline khi lỗi network.
   *
   * ⚠️ CHỈ áp dụng cho lỗi NETWORK:
   *   - Lỗi network  -> server không nhận yêu cầu -> thao tác chưa xảy ra
   *                     -> an toàn để lưu lại và upload sau.
   *   - Lỗi 4xx/5xx  -> server ĐÃ xử lý (hoặc từ chối) -> không biết trạng thái
   *                     -> không queue (tránh tạo bản ghi trùng).
   *
   * @param {string} name - tên method
   * @param {Array} args - arguments của method
   * @returns {Promise<boolean>} true nếu đã lưu offline thành công
   */
  const tryQueueMutation = async (name, args) => {
    if (typeof mutationHandler !== 'function') return false;

    try {
      const handled = await mutationHandler(name, args);
      return handled === true;
    } catch (e) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.warn(`[SafeService:${label}.${name}] lỗi khi lưu offline:`, e?.message);
      }
      return false;
    }
  };

  /**
   * Bọc 1 method của real service với fallback sang mock.
   *
   * ⚠️ VÌ SAO KHÔNG DÙNG `async (...args) => await real[name](...)`:
   *   Method async generator (`async function*`) KHÔNG trả về Promise mà trả về
   *   object có `[Symbol.asyncIterator]()`. Nếu bọc bằng `async/await` thì `await`
   *   sẽ chờ generator KẾT THÚC rồi trả về object generator ->
   *   `for await (const x of proxy.streamPlanProgress())` ném
   *   "TypeError: Object is not async iterable".
   *
   *   => Wrapper này KHÔNG khai báo `async`: nó gọi real TRƯỚC, rồi kiểm tra
   *      runtime kết quả là async iterable hay Promise, và trả về tương ứng.
   *      Nhờ vậy hỗ trợ được CẢ method thường LẪN async generator mà không cần
   *      "đoán" loại hàm (Babel làm hỏng `constructor.name`).
   *
   * @param {string} name
   * @param {Function} realFn
   * @param {Function|null} mockFn
   * @returns {Function}
   */
  const wrapMethod = (name, realFn, mockFn) => {
    // Method này là ĐỌC hay GHI? (B1 - chính sách lỗi khác nhau cho đọc/ghi)
    const isWrite = isWriteMethod(serviceKey, name);

    return function wrappedMethod(...args) {
      // ── Gọi real ──
      let realResult;
      try {
        realResult = realFn.apply(realService, args);
      } catch (e) {
        // Lỗi ném ĐỒNG BỘ (không phải generator lazy) -> xử lý như method thường.
        if (!shouldFallback(e)) throw e;
        const status = extractStatus(e);
        const isServerError = status !== null && status >= 500;

        // ── B1 / Option B: GHI + lỗi 5xx -> NÉM LỖI THẬT (không mock, không queue) ──
        if (isWrite && isServerError) throw e;

        // ── 5xx khi ĐỌC: KHÔNG trả dữ liệu giả (Option C) ──
        // Nếu được phép trả dữ liệu giả (chế độ demo) -> trả mock cho nhất quán
        // với nhánh Promise bên dưới.
        if (isServerError && !(allowMockData && typeof mockFn === 'function')) throw e;

        if (allowMockData && typeof mockFn === 'function') {
          logFallback(label, name, e);
          return mockFn.apply(mockService, args);
        }
        throw e;
      }

      // ── Kết quả là async iterable (generator) -> trả về generator wrapper ──
      if (isAsyncIterable(realResult)) {
        return (async function* wrappedStream() {
          const source = realResult[Symbol.asyncIterator]();
          while (true) {
            let step;
            try {
              step = await source.next();
            } catch (e) {
              if (!shouldFallback(e)) throw e;
              const status = extractStatus(e);
              const isServerError = status !== null && status >= 500;

              // GHI + 5xx -> ném lỗi thật (Option B).
              if (isWrite && isServerError) throw e;

              if (allowMockData && typeof mockFn === 'function') {
                logFallback(label, name, e);

                // Chuyển sang generator của mock, phát lại từ đầu.
                const mockSource = mockFn.apply(mockService, args)[Symbol.asyncIterator]();
                while (true) {
                  const mockStep = await mockSource.next();
                  if (mockStep.done) return;
                  yield mockStep.value;
                }
              }
              throw e;
            }

            if (step.done) return;
            yield step.value;
          }
        })();
      }

      // ── Kết quả là Promise -> bọc fallback ──
      return Promise.resolve(realResult).catch(async (e) => {
        // 4xx (và lỗi không xác định) -> ném thẳng, UI form hiển thị.
        if (!shouldFallback(e)) throw e;

        const status = extractStatus(e);
        const isServerError = status !== null && status >= 500;

        // ── B1 / Option B: GHI + lỗi 5xx -> NÉM LỖI THẬT ──
        // Server ĐÃ xử lý yêu cầu và báo lỗi -> không queue (tránh bản ghi trùng),
        // không mock (tránh báo "thành công giả"). User phải thấy lỗi thật.
        if (isWrite && isServerError) throw e;

        // ── Lỗi NETWORK ──
        if (isNetworkError(e)) {
          // Tầng 0: thao tác GHI -> lưu offline để upload sau.
          if (isWrite) {
            const queued = await tryQueueMutation(name, args);
            if (queued) {
              // Đã lưu offline -> ném lỗi riêng để UI hiện "đã lưu, sẽ đồng bộ".
              throw new OfflineQueuedError(name);
            }
            // Không có handler (ghi tài chính/gia đình) -> ném lỗi tường minh.
            throw new OfflineRequiresNetworkError(name, serviceKey);
          }

          // Tầng 1: dữ liệu CACHE LOCAL (chỉ khi lỗi network).
          const cached = await tryCache(name, args);
          if (cached.hit) {
            logCache(label, name);
            return cached.value;
          }
        }

        // ── Tầng cuối: MOCK chỉ khi được phép, ngược lại ném lỗi thật ──
        return fallbackToMockOrThrow(name, mockFn, args, e);
      });
    };
  };

  const proxy = {};

  // ══════════════════════════════════════════════════════════════════
  // BƯỚC 1 — Thu tập method của MOCK (contract chuẩn của domain).
  //
  // ⚠️ BUG ĐÃ SỬA (rà soát Sprint B4): trước đây vòng này là nguồn DUY NHẤT
  //   của proxy -> method CHỈ có ở Real KHÔNG được expose.
  //   Ví dụ `RealUserService.getFamilyInfo()` -> `services.userService.getFamilyInfo`
  //   là `undefined` -> `userService.getFamilyInfo()` ném TypeError ->
  //   FamilyManagementScreen luôn hiện lỗi tải dù BE hoàn toàn ổn.
  // ══════════════════════════════════════════════════════════════════
  collectNames(mockService).forEach((name) => {
    const mockValue = mockService[name];

    // Property không phải function (vd isReady, version, tag) -> lấy thẳng từ real
    // nếu real có, ngược lại lấy từ mock. UI/test có đọc bình thường.
    if (typeof mockValue !== 'function') {
      if (name in realService) {
        proxy[name] = realService[name];
      } else {
        proxy[name] = mockValue;
      }
      return;
    }

    // Method -> bọc fallback.
    //
    // ⚠️ `wrapMethod` KHÔNG dùng `async/await` -> giữ được async generator
    //   (`for await` hoạt động) VÀ method thường.
    if (typeof realService[name] === 'function') {
      proxy[name] = wrapMethod(name, realService[name], mockValue);
      return;
    }

    // Real chưa implement method này -> KHÔNG được trả dữ liệu giả (Option C).
    // Ném lỗi rõ ràng để dev biết method chưa được hỗ trợ, thay vì âm thầm
    // trả dữ liệu mock khiến user tưởng là dữ liệu thật.
    proxy[name] = (...args) => {
      if (allowMockData) return mockService[name](...args);
      const err = new Error(
        `[SafeService:${label}.${name}] Method chưa được hỗ trợ ở service thật (chưa implement)`
      );
      err.name = 'MethodNotSupportedError';
      err.methodName = name;
      err.serviceKey = serviceKey;
      throw err;
    };
  });

  // ══════════════════════════════════════════════════════════════════
  // BƯỚC 2 — Method CHỈ có ở REAL (mock không khai báo).
  //
  // ⚠️ BUG ĐÃ SỬA (rà soát Sprint B4): trước đây vòng này CHỈ expose property
  //   KHÔNG phải function -> method chỉ có ở Real bị bỏ sót -> UI gọi thì
  //   "undefined is not a function".
  //
  //   Ví dụ thật: `RealUserService.getFamilyInfo()` (mock không có) ->
  //   `services.userService.getFamilyInfo` là `undefined` ->
  //   FamilyManagementScreen luôn hiển thị lỗi tải dù BE hoàn toàn ổn.
  //
  //   Giờ: expose method của Real, bọc fallback y hệt method của mock.
  //   Nếu Real lỗi 5xx/network mà mock KHÔNG có method tương ứng -> ném lên
  //   (không có dữ liệu giả nào để fallback -> phải nói thật với user).
  // ══════════════════════════════════════════════════════════════════
  collectNames(realService).forEach((name) => {
    if (name === 'constructor' || name in proxy) return;

    const realValue = realService[name];

    // Property không phải function -> lấy thẳng.
    if (typeof realValue !== 'function') {
      proxy[name] = realValue;
      return;
    }

    // Method (kể cả async generator) -> bọc fallback giống hệt method của mock.
    proxy[name] = wrapMethod(name, realValue, null);
  });

  return proxy;
};
