import axiosClient from '../utils/axios';

/**
 * Lấy thông tin hồ sơ người dùng hiện tại
 * GET /api/v1/users/me
 */
export const getMeApi = async () => {
  return await axiosClient.get('/users/me');
};

/**
 * Cập nhật tên, giới tính, ngày sinh, bio
 * PATCH /api/v1/users/me/profile
 */
export const updateProfileApi = async (data) => {
  return await axiosClient.patch('/users/me/profile', data);
};

/**
 * Upload ảnh đại diện
 * POST /api/v1/users/me/avatar
 */
export const uploadAvatarApi = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return await axiosClient.post('/users/me/avatar', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};
