import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Building2,
  Mail,
  User,
  Phone,
  MapPin,
  Globe,
  FileText,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  Store,
  ShieldCheck,
  Send,
  Clock,
  ArrowRight,
  Hash,
} from 'lucide-react';
import { applySupplierApi } from '../../../services/supplierService';
import { showToast } from '../../../components/common/Toast';

export const SupplierRegister = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submittedApp, setSubmittedApp] = useState(null);

  const [formData, setFormData] = useState({
    companyName: '',
    taxCode: '',
    contactName: '',
    email: '',
    phone: '',
    address: '',
    website: '',
    description: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.companyName.trim() || !formData.contactName.trim() || !formData.email.trim()) {
      setError('Vui lòng điền đầy đủ các thông tin bắt buộc (*)');
      return;
    }

    // Validate taxCode
    const taxCodeRegex = /^\d{10}(-\d{3})?$/;
    if (!formData.taxCode.trim()) {
      setError('Vui lòng nhập mã số thuế doanh nghiệp');
      return;
    }
    if (!taxCodeRegex.test(formData.taxCode.trim())) {
      setError('Mã số thuế không hợp lệ (VD: 0101234567 hoặc 0101234567-001)');
      return;
    }

    let formattedWebsite = formData.website.trim() || undefined;
    if (formattedWebsite) {
      if (!/^https?:\/\//i.test(formattedWebsite)) {
        formattedWebsite = `https://${formattedWebsite}`;
      }
      try {
        new URL(formattedWebsite);
      } catch {
        setError('Website phải là URL hợp lệ (ví dụ: https://abcfarm.vn)');
        return;
      }
    }

    setLoading(true);
    try {
      const payload = {
        companyName: formData.companyName.trim(),
        taxCode: formData.taxCode.trim(),
        contactName: formData.contactName.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim() || undefined,
        address: formData.address.trim() || undefined,
        website: formattedWebsite,
        description: formData.description.trim() || undefined,
      };

      const res = await applySupplierApi(payload);
      const data = res?.data || res;
      setSubmittedApp(data);
      showToast.success('Nộp đơn đăng ký đối tác thành công!');
    } catch (err) {
      console.error('Apply Supplier Error:', err);
      const msg = err.message || 'Nộp đơn đăng ký thất bại. Vui lòng kiểm tra lại thông tin!';
      setError(msg);
      showToast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#faf7f0] via-[#fffdfa] to-[#fbf7ee] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-xl px-4">
        {/* Top Navigation */}
        <div className="flex items-center justify-between mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-amber-800 transition-colors bg-white/80 backdrop-blur-sm px-3.5 py-2 rounded-2xl border border-amber-200/60 shadow-2xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Quay lại trang chủ
          </Link>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 bg-amber-100/60 px-3 py-1.5 rounded-full border border-amber-200/60">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Đối Tác Cung Ứng Thực Phẩm B2B</span>
          </div>
        </div>

        {/* Brand Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center gap-1 mb-2">
            <span className="text-2xl font-black tracking-tight text-[#1b4332]">Fri</span>
            <span className="text-2xl font-black text-amber-600">ggy</span>
            <span className="px-2 py-0.5 rounded-md bg-amber-200/80 text-amber-900 text-[10px] font-black border border-amber-300 uppercase tracking-wider ml-1.5 flex items-center gap-1">
              <Store className="w-3 h-3" />
              ĐỐI TÁC CUNG ỨNG
            </span>
          </div>
          <h2 className="mt-2 text-xl sm:text-2xl font-black text-slate-800">
            Đăng Ký Trở Thành Đối Tác Friggy
          </h2>
          <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
            Hợp tác phân phối nông sản, thực phẩm sạch và tiếp cận hàng ngàn người tiêu dùng thông minh trên nền tảng Friggy.
          </p>
        </div>

        {/* Form Card */}
        <div className="mt-6 bg-white py-8 px-6 sm:px-10 rounded-3xl shadow-xl border border-amber-200/70 relative overflow-hidden">
          {submittedApp ? (
            /* Success State */
            <div className="text-center py-4 space-y-5 animate__animated animate__fadeIn">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <span className="px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300 inline-flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Trạng thái: Đang chờ xét duyệt
                </span>
                <h3 className="text-lg font-black text-slate-800 mt-2">
                  Đơn Đăng Ký Đã Được Tiếp Nhận!
                </h3>
                <p className="text-xs text-slate-500 mt-1.5 max-w-md mx-auto leading-relaxed">
                  Cảm ơn doanh nghiệp <span className="font-bold text-slate-800">{submittedApp.companyName}</span> đã quan tâm hợp tác cùng Friggy. Đơn đăng ký của bạn đã được chuyển tới Ban quản trị để thẩm định.
                </p>
              </div>

              {/* Application Details Summary */}
              <div className="bg-amber-50/70 border border-amber-200/70 rounded-2xl p-4 text-left space-y-2 text-xs">
                <div className="flex justify-between items-center border-b border-amber-200/40 pb-2">
                  <span className="text-slate-500">Mã đơn đăng ký:</span>
                  <span className="font-mono font-bold text-amber-950 truncate max-w-[200px]">
                    {submittedApp.id}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-amber-200/40 pb-2">
                  <span className="text-slate-500">Người liên hệ:</span>
                  <span className="font-bold text-slate-800">{submittedApp.contactName}</span>
                </div>
                <div className="flex justify-between items-center border-b border-amber-200/40 pb-2">
                  <span className="text-slate-500">Email nhận tài khoản:</span>
                  <span className="font-bold text-slate-800">{submittedApp.email}</span>
                </div>
                {submittedApp.phone && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Số điện thoại:</span>
                    <span className="font-bold text-slate-800">{submittedApp.phone}</span>
                  </div>
                )}
              </div>

              <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 text-xs text-left flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <b>Bước tiếp theo:</b> Sau khi Admin phê duyệt hồ sơ, hệ thống sẽ tự động gửi email kèm <b>đường link thiết lập mật khẩu</b> đến hòm thư <span className="font-bold">{submittedApp.email}</span>. Bạn vui lòng kiểm tra hộp thư (kể cả mục Spam).
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => navigate('/')}
                  className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl transition-all cursor-pointer"
                >
                  Về trang chủ
                </button>
                <button
                  onClick={() => navigate('/login')}
                  className="flex-1 py-3 px-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs rounded-2xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Trang đăng nhập</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            /* Register / Apply Form */
            <>
              {error && (
                <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold animate__animated animate__shakeX">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* 1. Company Information */}
                <div className="border-b border-slate-100 pb-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5" />
                    1. Thông tin doanh nghiệp / Hộ kinh doanh
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tên công ty / Thương hiệu nông sản <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      name="companyName"
                      value={formData.companyName}
                      onChange={handleChange}
                      placeholder="Ví dụ: Công ty TNHH Nông Sản Xanh Farm"
                      required
                      maxLength={150}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                    />
                  </div>
                </div>

                {/* Tax Code */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mã số thuế doanh nghiệp <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Hash className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      name="taxCode"
                      value={formData.taxCode}
                      onChange={handleChange}
                      placeholder="VD: 0101234567 hoặc 0101234567-001"
                      required
                      maxLength={20}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    10 chữ số (hoặc 10 chữ số + mã chi nhánh, ví dụ: 0101234567-001)
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Website công ty (nếu có)
                    </label>
                    <div className="relative">
                      <Globe className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="url"
                        name="website"
                        value={formData.website}
                        onChange={handleChange}
                        placeholder="https://abcfarm.vn"
                        maxLength={255}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Địa chỉ trụ sở / Kho bãi
                    </label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        placeholder="Số nhà, đường, phường, tỉnh/thành"
                        maxLength={255}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Contact Representative */}
                <div className="border-b border-slate-100 pb-2 pt-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    2. Người đại diện liên hệ
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Họ và tên người đại diện <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        name="contactName"
                        value={formData.contactName}
                        onChange={handleChange}
                        placeholder="Nguyễn Văn A"
                        required
                        maxLength={100}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Số điện thoại liên hệ
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="0901234567"
                        maxLength={20}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Email doanh nghiệp (Dùng để nhận tài khoản đăng nhập) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="contact@nongsanxanh.com"
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Khi đơn được duyệt, Friggy sẽ gửi link kích hoạt tài khoản và đặt mật khẩu tới email này.
                  </p>
                </div>

                {/* 3. Description / Capacity */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Giới thiệu ngắn về nguồn gốc thực phẩm & năng lực cung ứng
                  </label>
                  <textarea
                    name="description"
                    rows={3}
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Ví dụ: Trang trại rau củ chuẩn VietGAP tại Đà Lạt, năng lực cung ứng 500kg/ngày, nguồn gốc rõ ràng..."
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                  />
                </div>

                {/* Notice Card */}
                <div className="p-3.5 rounded-2xl bg-amber-50/90 border border-amber-200/80 text-amber-950 text-xs flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="leading-relaxed text-[11px]">
                    <span className="font-extrabold text-amber-900">Quy trình B2B Onboarding: </span>
                    Sau khi gửi đơn, Ban quản trị Friggy sẽ thẩm định tính pháp lý và gửi email thông báo kết quả. Khi đơn được duyệt, bạn sẽ nhận được link đặt mật khẩu để đăng nhập vào Cổng Nhà Cung Cấp.
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs sm:text-sm rounded-2xl shadow-lg shadow-amber-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    {loading ? 'Đang gửi đơn đăng ký...' : 'Nộp Đơn Đăng Ký Đối Tác'}
                  </button>
                </div>
              </form>

              <div className="mt-6 text-center text-xs text-slate-500">
                Doanh nghiệp đã được cấp tài khoản?{' '}
                <Link to="/login?redirect=/supplier/dashboard" className="font-bold text-amber-700 hover:text-amber-800 underline">
                  Đăng nhập ngay
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SupplierRegister;
