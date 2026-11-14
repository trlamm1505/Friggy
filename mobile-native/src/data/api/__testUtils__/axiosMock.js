/**
 * Mock axios cho test - kiểm soát thủ công instance + interceptor
 *
 * `axios.create()` trả lần lượt 2 instance:
 *   1. mainClient (có interceptor request/response)
 *   2. rawClient  (không interceptor - dùng cho /auth/refresh)
 */

const makeMockClient = () => {
  const interceptors = { request: null, response: null };
  return {
    defaults: { headers: { common: {} } },
    interceptors: {
      request: {
        use: (fulfilled, rejected) => {
          interceptors.request = { fulfilled, rejected };
        },
      },
      response: {
        use: (fulfilled, rejected) => {
          interceptors.response = { fulfilled, rejected };
        },
      },
    },
    request: jest.fn(),
    __interceptors: interceptors,
    __reset: () => {
      interceptors.request = null;
      interceptors.response = null;
      this.defaults.headers.common = {};
      this.request.mockReset();
    },
  };
};

// Biến chia sẻ: test đọc để chạy interceptor bằng tay
const instances = [];

/** Hàm tạo instance dùng chung cho cả `axios.create` và named export `create` */
const create = jest.fn(() => {
  const client = makeMockClient();
  instances.push(client);
  return client;
});

const axios = {
  create,
  get: jest.fn(),
  post: jest.fn(),
  __instances: instances,
  __reset: () => {
    instances.length = 0;
    create.mockClear();
  },
};

// ApiClient import `{ create as createAxiosInstance }` -> phải export named
module.exports = axios;
module.exports.create = create;
module.exports.default = axios;
