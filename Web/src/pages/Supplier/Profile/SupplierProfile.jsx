import React, { useState, useEffect } from 'react';
import {
  Building2,
  Phone,
  MapPin,
  FileText,
  Upload,
  CheckCircle2,
  XCircle,
  Clock,
  Save,
  AlertCircle,
  Hash,
  Lock,
} from 'lucide-react';
import {
  getSupplierProfileApi,
  registerSupplierApi,
  updateSupplierProfileApi,
  uploadSupplierLogoApi,
} from '../../../services/supplierService';
import { showToast } from '../../../components/common/Toast';
import cuteMascotImg from '../../../assets/images/cute_mascot.png';
import { API_BASE_URL } from '../../../utils/constants';

export const SupplierProfile = () => {
  const [profile, setProfile] = useState(null);
  const [isNew, setIsNew] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [formData, setFormData] = useState({
    companyName: '',
    contactPhone: '',
    address: '',
    description: '',
  });

  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const res = await getSupplierProfileApi();
      const data = res?.data || res;
      setProfile(data);
      setIsNew(false);
      setFormData({
        companyName: data.companyName || '',
        contactPhone: data.contactPhone || '',
        address: data.address || '',
        description: data.description || '',
      });
    } catch (err) {
      if (err?.status === 404) {
        setIsNew(true);
        setProfile(null);
      } else {
        showToast.error(err.message || 'Không thể tải thông tin hồ sơ');
      }
    } finally {
      setLoading(false);
    }
  };

  const resolveLogoUrl = (rawUrl) => {
    if (!rawUrl) return cuteMascotImg;
    let formatted = String(rawUrl).trim();
    if (formatted.startsWith('blob:') || formatted.startsWith('data:')) {
      return formatted;
    }
    if (formatted.includes('api.friggy.io.vn')) {
      formatted = formatted.replace('api.friggy.io.vn', 'file.friggy.io.vn');
    }
    let fullUrl = formatted;
    if (!formatted.startsWith('http://') && !formatted.startsWith('https://')) {
      const apiBase = API_BASE_URL || 'https://api.friggy.io.vn/api/v1';
      let fileBase = 'https://file.friggy.io.vn';
      if (!apiBase.includes('friggy.io.vn')) {
        fileBase = apiBase.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');
      }
      fullUrl = `${fileBase}${formatted.startsWith('/') ? '' : '/'}${formatted}`;
    }
    if (fullUrl.includes('ngrok') && !fullUrl.includes('ngrok-skip-browser-warning')) {
      const sep = fullUrl.includes('?') ? '&' : '?';
      fullUrl = `${fullUrl}${sep}ngrok-skip-browser-warning=true`;
    }
    return fullUrl;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.companyName.trim()) {
      showToast.error('Vui lòng nhập tên công ty / thương hiệu');
      return;
    }
    if (formData.contactPhone && !/^[0-9+\s\-]{8,15}$/.test(formData.contactPhone.trim())) {
      showToast.error('Số điện thoại liên hệ không đúng định dạng (8 - 15 số)');
      return;
    }

    setSaving(true);
    try {
      if (isNew) {
        const res = await registerSupplierApi(formData);
        const data = res?.data || res;
        setProfile(data);
        setIsNew(false);
        showToast.success('Đăng ký hồ sơ nhà cung cấp thành công! Vui lòng chờ admin duyệt.');
      } else {
        const res = await updateSupplierProfileApi(formData);
        const data = res?.data || res;
        setProfile(data);
        showToast.success('Cập nhật hồ sơ doanh nghiệp thành công!');
      }
    } catch (err) {
      showToast.error(err.message || 'Không thể lưu thông tin hồ sơ');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showToast.error('Kích thước ảnh tối đa là 5MB');
        return;
      }
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        showToast.error('Định dạng ảnh không hợp lệ. Vui lòng chọn file JPG, PNG hoặc WEBP');
        return;
      }
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
      showToast.info('Đã chọn file logo mới. Bấm "Lưu ảnh logo" để hoàn tất.');
    }
  };

  const handleUploadLogo = async () => {
    if (!logoFile) return;
    setUploadingLogo(true);
    showToast.info('Đang tải ảnh logo lên máy chủ...');
    try {
      const data = new FormData();
      data.append('file', logoFile);
      const res = await uploadSupplierLogoApi(data);
      const updated = res?.data || res;
      setProfile((prev) => ({ ...prev, logoPath: updated.logoPath }));
      setLogoFile(null);
      showToast.success('Upload logo doanh nghiệp thành công!');
    } catch (err) {
      showToast.error(err.message || 'Không thể upload logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      {/* ── Approval Status Notice ─────────────────────────────────── */}
      {profile && (
        <div className="bg-white rounded-3xl border border-emerald-100 p-6 sm:p-7 shadow-xs">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              {profile.isVerified ? (
                <div className="p-3.5 bg-emerald-100 text-emerald-600 rounded-2xl">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
              ) : (
                <div className="p-3.5 bg-amber-100 text-amber-600 rounded-2xl">
                  <Clock className="w-7 h-7 animate-spin-slow" />
                </div>
              )}
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="font-bold text-base sm:text-lg text-slate-800">
                    Trạng thái kiểm duyệt hồ sơ:
                  </h3>
                  <span
                    className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-black uppercase tracking-wide ${
                      profile.isVerified
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-amber-100 text-amber-800 border border-amber-300'
                    }`}
                  >
                    {profile.isVerified ? 'Đã xác minh (Verified)' : 'Chờ xét duyệt (Pending)'}
                  </span>
                </div>
                {profile.approvalStatus === 'rejected' && profile.rejectionReason && (
                  <p className="text-sm text-rose-700 mt-1.5 font-medium">
                    <span className="font-bold">Lý do từ chối:</span> {profile.rejectionReason}
                  </p>
                )}
                {profile.approvalStatus === 'approved' && profile.approvedAt && (
                  <p className="text-xs sm:text-sm text-slate-400 mt-1">
                    Ngày phê duyệt: {new Date(profile.approvedAt).toLocaleDateString('vi-VN')}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Main Form & Logo Layout ────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-7">
        {/* Left: Logo & Company Visual Card */}
        <div className="lg:col-span-4 bg-white rounded-3xl border border-emerald-100 p-7 sm:p-8 shadow-xs flex flex-col items-center text-center">
          <div className="w-44 h-44 sm:w-52 sm:h-52 rounded-3xl overflow-hidden bg-emerald-50 border-2 border-dashed border-emerald-300 flex items-center justify-center p-3 relative group">
            <img
              src={logoPreview || resolveLogoUrl(profile?.logoPath)}
              alt="Logo"
              className="w-full h-full object-contain rounded-2xl"
            />
          </div>

          <h3 className="font-black text-slate-800 text-lg sm:text-xl mt-5">
            {formData.companyName || 'Tên doanh nghiệp'}
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">Logo đại diện thương hiệu Friggy</p>

          <div className="mt-6 w-full space-y-3.5">
            <label className="block w-full">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleLogoFileChange}
                className="hidden"
                disabled={isNew}
              />
              <span
                className={`w-full py-3 px-5 rounded-2xl border border-emerald-300 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-all ${
                  isNew
                    ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 shadow-2xs'
                }`}
              >
                <Upload className="w-4 h-4" />
                Chọn file logo mới
              </span>
            </label>

            {logoFile && !isNew && (
              <button
                onClick={handleUploadLogo}
                disabled={uploadingLogo}
                className="w-full py-3 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {uploadingLogo ? 'Đang tải lên...' : 'Lưu ảnh logo'}
              </button>
            )}

            {isNew && (
              <p className="text-xs text-emerald-800 bg-emerald-50 p-3 rounded-2xl border border-emerald-200 text-left leading-relaxed">
                💡 Bạn có thể tải lên logo sau khi hoàn tất đăng ký thông tin doanh nghiệp ở bên cạnh.
              </p>
            )}
          </div>
        </div>

        {/* Right: Company Form Fields */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-emerald-100 p-7 sm:p-9 shadow-xs">
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 flex items-center gap-2.5 mb-1.5">
            <Building2 className="w-6 h-6 text-emerald-600" />
            {isNew ? 'Đăng ký thông tin nhà cung cấp' : 'Thông tin chi tiết doanh nghiệp'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mb-7">
            Thông tin này sẽ được hiển thị cho khách hàng và dùng để xét duyệt đối tác.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-2">
                Tên công ty / Thương hiệu <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Building2 className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleInputChange}
                  placeholder="Ví dụ: Công ty TNHH Nông Sản Xanh Farm"
                  required
                  className="w-full pl-12 pr-4 py-3 sm:py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>
            </div>

              {/* Mã số thuế - read-only */}
              {profile?.taxCode && (
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-2">
                    <span className="flex items-center gap-1.5">
                      <Hash className="w-4 h-4 text-emerald-600" />
                      Mã số thuế doanh nghiệp
                      <span className="ml-auto px-2 py-0.5 rounded-lg bg-slate-100 text-slate-500 text-[10px] font-bold flex items-center gap-1 border border-slate-200">
                        <Lock className="w-3 h-3" /> Chỉ xem
                      </span>
                    </span>
                  </label>
                  <div className="relative">
                    <Hash className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                    <input
                      type="text"
                      value={profile.taxCode}
                      readOnly
                      className="w-full pl-12 pr-4 py-3 sm:py-3.5 bg-slate-100 border border-slate-200 rounded-2xl text-xs sm:text-sm font-mono font-bold text-slate-500 cursor-not-allowed"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Mã số thuế đã được Admin phê duyệt, không thể thay đổi.
                  </p>
                </div>
              )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-2">
                  Số điện thoại liên hệ
                </label>
                <div className="relative">
                  <Phone className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    name="contactPhone"
                    value={formData.contactPhone}
                    onChange={handleInputChange}
                    placeholder="Ví dụ: 0901234567"
                    className="w-full pl-12 pr-4 py-3 sm:py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-2">
                  Địa chỉ trụ sở / kho bãi
                </label>
                <div className="relative">
                  <MapPin className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="Ví dụ: 123 Lê Lợi, Quận 1, TP. HCM"
                    className="w-full pl-12 pr-4 py-3 sm:py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-2">
                Giới thiệu doanh nghiệp / Năng lực cung ứng
              </label>
              <textarea
                name="description"
                rows={5}
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Mô tả về quy trình trồng trọt, chứng nhận an toàn thực phẩm VietGAP, GlobalGAP, tiêu chuẩn phân phối..."
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all leading-relaxed"
              />
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-8 py-3.5 bg-gradient-to-r from-emerald-500 via-green-600 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-md shadow-emerald-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Đang lưu...' : isNew ? 'Gửi đăng ký hồ sơ' : 'Lưu thay đổi'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SupplierProfile;

