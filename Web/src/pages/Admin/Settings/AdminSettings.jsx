import React, { useState, useEffect } from 'react';
import {
  Settings,
  Save,
  CheckCircle2,
  Phone,
  Mail,
  Clock,
  Download,
  QrCode,
  Image as ImageIcon,
  Upload,
  RotateCcw,
} from 'lucide-react';
import { getSystemSettings, saveSystemSettings } from '../../../utils/systemSettings';
import { showToast } from '../../../components/common/Toast';
import defaultQrCode from '../../../assets/images/qr_code.png';

export const AdminSettings = () => {
  const [activeSubTab, setActiveSubTab] = useState('contact');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [generalConfig, setGeneralConfig] = useState(() => getSystemSettings());

  useEffect(() => {
    setGeneralConfig(getSystemSettings());
  }, []);

  const handleChangeGeneral = (e) => {
    const { name, value } = e.target;
    setGeneralConfig((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleQrFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      showToast.error('Kích thước ảnh vượt quá 3MB! Vui lòng chọn ảnh nhỏ hơn.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64String = event.target?.result;
      if (base64String) {
        setGeneralConfig((prev) => ({
          ...prev,
          qrImageUrl: base64String,
        }));
        showToast.success('Đã chọn ảnh mã QR! Bấm "Lưu Cấu Hình Hệ Thống" để áp dụng.');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResetQr = () => {
    setGeneralConfig((prev) => ({
      ...prev,
      qrImageUrl: '',
    }));
    showToast.info('Đã khôi phục mã QR Code về mặc định hệ thống.');
  };

  const handleSave = (e) => {
    e.preventDefault();
    saveSystemSettings(generalConfig);
    showToast.success('Cập nhật cấu hình hệ thống thành công!');
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3500);
  };

  return (
    <div className="space-y-6 pb-12 animate__animated animate__fadeIn animate__faster">
      {/* Top Banner */}
      <div className="animate__animated animate__fadeInDown p-6 sm:p-8 rounded-[32px] bg-white border border-emerald-100 shadow-xs flex items-center justify-between">
        <div>
          <h3 className="text-xl sm:text-2xl font-black text-emerald-950 tracking-tight flex items-center gap-2">
            <span>Thiết Lập & Cấu Hình Hệ Thống</span>
            <Settings className="w-5 h-5 text-emerald-600" />
          </h3>
          <p className="text-xs sm:text-sm text-emerald-900/65 font-medium mt-1">
            Tùy chỉnh thông tin liên hệ hỗ trợ, liên kết tải ứng dụng di động và ảnh mã QR code hiển thị cho người dùng.
          </p>
        </div>
      </div>

      {/* Sub-Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-emerald-200/80 pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveSubTab('contact')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'contact'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-white text-emerald-900 hover:bg-emerald-50'
          }`}
        >
          <Phone className="w-4 h-4" />
          <span>Thông Tin Liên Hệ & Hỗ Trợ</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('download')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'download'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-white text-emerald-900 hover:bg-emerald-50'
          }`}
        >
          <Download className="w-4 h-4" />
          <span>Link Tải Ứng Dụng</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('qrcode')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'qrcode'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-white text-emerald-900 hover:bg-emerald-50'
          }`}
        >
          <QrCode className="w-4 h-4" />
          <span>Mã QR Code</span>
        </button>
      </div>

      {/* Save Success Alert */}
      {savedSuccess && (
        <div
          className="animate__animated animate__fadeInDown p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Đã lưu thành công cấu hình hệ thống! Dữ liệu đã được đồng bộ.</span>
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="animate__animated animate__fadeInUp p-6 sm:p-8 rounded-[32px] bg-white border border-emerald-100 shadow-xs space-y-6">
        {/* Tab 1: Thông tin liên hệ & hỗ trợ */}
        {activeSubTab === 'contact' && (
          <div className="space-y-4">
            <h4 className="text-sm font-black text-emerald-950 border-b border-emerald-100 pb-3 flex items-center gap-2">
              <Phone className="w-4 h-4 text-emerald-600" />
              <span>Thông Tin Liên Hệ & Trợ Giúp</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Hotline / SĐT Hỗ Trợ</span>
                </label>
                <input
                  type="text"
                  name="supportHotline"
                  value={generalConfig.supportHotline || ''}
                  onChange={handleChangeGeneral}
                  placeholder="VD: 1900 8888 - 0988 123 456"
                  className="w-full px-4 py-3 bg-slate-50 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-2xl text-xs font-semibold text-slate-900 outline-hidden transition-all"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Email Trợ Giúp</span>
                </label>
                <input
                  type="email"
                  name="supportEmail"
                  value={generalConfig.supportEmail || ''}
                  onChange={handleChangeGeneral}
                  placeholder="VD: support@friggy.app"
                  className="w-full px-4 py-3 bg-slate-50 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-2xl text-xs font-semibold text-slate-900 outline-hidden transition-all"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Thời Gian Làm Việc</span>
                </label>
                <input
                  type="text"
                  name="workingHours"
                  value={generalConfig.workingHours || ''}
                  onChange={handleChangeGeneral}
                  placeholder="VD: Hỗ trợ 24/7 (Phản hồi trong 5 phút)"
                  className="w-full px-4 py-3 bg-slate-50 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-2xl text-xs font-semibold text-slate-900 outline-hidden transition-all"
                  required
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Link Tải Ứng Dụng */}
        {activeSubTab === 'download' && (
          <div className="space-y-4">
            <h4 className="text-sm font-black text-emerald-950 border-b border-emerald-100 pb-3 flex items-center gap-2">
              <Download className="w-4 h-4 text-emerald-600" />
              <span>Link Tải Ứng Dụng Di Động</span>
            </h4>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 flex items-center gap-1">
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                <span>Link Tải Ứng Dụng (Download URL)</span>
              </label>
              <input
                type="text"
                name="downloadUrl"
                value={generalConfig.downloadUrl || ''}
                onChange={handleChangeGeneral}
                placeholder="VD: https://friggy.ai/download"
                className="w-full px-4 py-3 bg-slate-50 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-2xl text-xs font-semibold text-slate-900 outline-hidden transition-all"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                * Liên kết này sẽ được kết nối API Backend sau.
              </p>
            </div>
          </div>
        )}

        {/* Tab 3: Mã QR Code */}
        {activeSubTab === 'qrcode' && (
          <div className="space-y-4">
            <h4 className="text-sm font-black text-emerald-950 border-b border-emerald-100 pb-3 flex items-center gap-2">
              <QrCode className="w-4 h-4 text-emerald-600" />
              <span>Cấu Hình Mã QR Code Tải App</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
              <div className="md:col-span-2 space-y-4">
                {/* Option A: Paste URL */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 flex items-center gap-1">
                    <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Dán Link URL Ảnh Mã QR</span>
                  </label>
                  <input
                    type="text"
                    name="qrImageUrl"
                    value={generalConfig.qrImageUrl || ''}
                    onChange={handleChangeGeneral}
                    placeholder="https://... hoặc data:image/png;base64,..."
                    className="w-full px-4 py-3 bg-slate-50 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-2xl text-xs font-semibold text-slate-900 outline-hidden transition-all"
                  />
                </div>

                {/* Option B: Upload file from computer */}
                <div className="p-4 bg-emerald-50/40 border border-emerald-100 rounded-2xl flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h5 className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Hoặc Tải File Ảnh Từ Máy Tính</span>
                    </h5>
                    <p className="text-[11px] text-emerald-800/70 mt-0.5">
                      Đường dẫn ảnh sẽ được kết nối API Upload Backend sau.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <label
                      htmlFor="qr-upload-input"
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Chọn Ảnh File</span>
                    </label>
                    <input
                      id="qr-upload-input"
                      type="file"
                      accept="image/*"
                      onChange={handleQrFileUpload}
                      className="hidden"
                    />

                    {generalConfig.qrImageUrl && (
                      <button
                        type="button"
                        onClick={handleResetQr}
                        className="px-3 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                        title="Khôi phục QR mặc định"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Mặc định</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Preview QR Code */}
              <div className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center">
                <span className="text-xs font-bold text-slate-600 mb-2">Xem Trước Mã QR Phía User</span>
                <img
                  src={generalConfig.qrImageUrl || defaultQrCode}
                  alt="QR Code Preview"
                  className="w-32 h-32 object-contain rounded-xl border border-slate-200 bg-white p-1.5 shadow-xs"
                  onError={(e) => {
                    e.target.src = defaultQrCode;
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Submit Footer */}
        <div className="pt-4 border-t border-emerald-100 flex justify-end">
          <button
            type="submit"
            className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-emerald-600/20 flex items-center gap-2 cursor-pointer transition-all hover:scale-102"
          >
            <Save className="w-4 h-4" />
            <span>Lưu Cấu Hình Hệ Thống</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminSettings;




