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
 *  4. appConfig.SAFE_FALLBACK=false để tắt fallback, dùng khi debug lỗi thật.
 */

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
 * Bọc 1 real service: mọi method gọi real trước, lỗi 5xx/network thì gọi mock.
 *
 * @param {object} realService - instance Real*Service
 * @param {object} mockService - instance Mock*Service (cung kiem prototype)
 * @param {object} [options]
 * @param {string} [options.label] - tên để log, vd 'fridge'
 * @param {boolean} [options.enabled] - mặc định appConfig.SAFE_FALLBACK
 * @returns {object} proxy có đúng các method của interface
 */
export const withFallback = (realService, mockService, options = {}) => {
  const { label = 'service', enabled } = options;

  if (!realService) return mockService;
  if (!mockService) return realService;

  // Tắt fallback -> trả thẳng real, không bọc (dùng khi debug lỗi thật)
  const isEnabled = enabled !== undefined ? enabled : true;
  if (!isEnabled) return realService;

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
    return function wrappedMethod(...args) {
      // ── Gọi real ──
      let realResult;
      try {
        realResult = realFn.apply(realService, args);
      } catch (e) {
        // Lỗi ném ĐỒNG BỘ (không phải generator lazy) -> xử lý như method thường.
        if (!shouldFallback(e)) throw e;
        if (typeof mockFn !== 'function') throw e;

        logFallback(label, name, e);
        return mockFn.apply(mockService, args);
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
              if (!shouldFallback(e) || typeof mockFn !== 'function') throw e;

              logFallback(label, name, e);

              // Chuyển sang generator của mock, phát lại từ đầu.
              const mockSource = mockFn.apply(mockService, args)[Symbol.asyncIterator]();
              while (true) {
                const mockStep = await mockSource.next();
                if (mockStep.done) return;
                yield mockStep.value;
              }
            }

            if (step.done) return;
            yield step.value;
          }
        })();
      }

      // ── Kết quả là Promise -> bọc fallback ──
      return Promise.resolve(realResult).catch((e) => {
        if (!shouldFallback(e)) throw e;
        if (typeof mockFn !== 'function') throw e;

        logFallback(label, name, e);
        return mockFn.apply(mockService, args);
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

    // Real chưa implement method này -> gọi mock thẳng,
    // đừng để UI nhận undefined.
    proxy[name] = (...args) => mockService[name](...args);
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
