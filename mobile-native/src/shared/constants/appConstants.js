// Map app_constants.dart
export const AppConstants = {
  // Network
  baseUrl: 'http://10.0.2.2:8080/api/v1',
  connectTimeout: 30000,
  receiveTimeout: 30000,

  // Storage keys
  keyAccessToken: 'access_token',
  keyRefreshToken: 'refresh_token',
  keyUserId: 'user_id',

  // App info
  appName: 'Friggy',
  designWidth: 412,
  designHeight: 915,

  // Default user (mock)
  defaultUser: {
    id: 'mock-user-1',
    name: 'Trần Quốc Lâm',
    email: 'lam@example.com',
    avatar: null,
    isFamilyPlan: false,
  },
};
