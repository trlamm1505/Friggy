import React, { useState, useEffect } from 'react';
import {
  Settings,
  Phone,
  Mail,
  Clock,
  QrCode,
  Download,
  Info,
  CheckCircle2,
  Shield,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';
import { getSystemSettings } from '../../../utils/systemSettings';
import defaultQrCode from '../../../assets/images/qr_code.png';

export const ManagerSettings = () => {
  const [generalConfig, setGeneralConfig] = useState(() => getSystemSettings());

  useEffect(() => {
    setGeneralConfig(getSystemSettings());
  }, []);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 animate__animated animate__fadeIn animate__faster">
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-[32px] bg-white border border-emerald-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>Cài Đặt Vận Hành & Hỗ Trợ Khách Hàng</span>
            <Settings className="w-5 h-5 text-teal-600" />
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Thông tin liên hệ hotline, mã QR tải ứng dụng Friggy Mobile và các quy trình hỗ trợ vận hành.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Contact & Support (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card: Contact Hotline */}
          <div className="bg-white rounded-[32px] p-6 sm:p-8 border border-slate-100 shadow-md space-y-5">
            <div className="flex items-center gap-2.5 border-b pb-4">
              <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
                <Phone className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-black text-slate-900">Kênh Hỗ Trợ Khách Hàng</h4>
                <p className="text-xs text-slate-500 font-medium">Thông tin đường dây nóng dành cho người dùng</p>
              </div>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <span className="font-bold text-slate-600 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-teal-600" /> Hotline Hỗ Trợ:
                </span>
                <span className="font-extrabold text-teal-800 text-sm">{generalConfig.hotline || '1900 6868'}</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <span className="font-bold text-slate-600 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-teal-600" /> Email Hỗ Trợ:
                </span>
                <span className="font-extrabold text-teal-800 text-sm">{generalConfig.email || 'support@friggy.vn'}</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <span className="font-bold text-slate-600 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-teal-600" /> Giờ Làm Việc:
                </span>
                <span className="font-extrabold text-slate-800">{generalConfig.supportHours || '08:00 - 21:00 hàng ngày'}</span>
              </div>
            </div>
          </div>

          {/* Card: Operational Guidelines */}
          <div className="bg-white rounded-[32px] p-6 sm:p-8 border border-slate-100 shadow-md space-y-4">
            <div className="flex items-center gap-2.5 border-b pb-4">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-black text-slate-900">Quy Trình Xử Lý Sự Cố</h4>
                <p className="text-xs text-slate-500 font-medium">Hướng dẫn nhanh cho Manager</p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-600 font-medium leading-relaxed">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <p className="font-bold text-slate-900">1. Khi khách hàng phản ánh lỗi giao dịch PayOS:</p>
                <p>Kiểm tra tại tab <strong>Lịch Sử Thanh Toán</strong>, tra cứu bằng User ID hoặc mã đơn Order Code để đối soát trạng thái (paid/pending/cancelled).</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <p className="font-bold text-slate-900">2. Khi tài khoản người dùng vi phạm chính sách:</p>
                <p>Vào tab <strong>Quản Lý Người Dùng</strong>, bấm vào biểu tượng Khóa để tạm khóa tài khoản ngay lập tức.</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <p className="font-bold text-slate-900">3. Khi cần cập nhật giá hoặc tính năng gói cước:</p>
                <p>Liên hệ <strong>Super Admin</strong> để điều chỉnh trong mục Cấu hình Hệ thống & Gói cước của Admin.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Mobile App QR Code & Downloads (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-[32px] p-6 sm:p-8 border border-slate-100 shadow-md space-y-6">
          <div className="flex items-center gap-2.5 border-b pb-4">
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-black text-slate-900">Mã QR Tải Ứng Dụng</h4>
              <p className="text-xs text-slate-500 font-medium">Dùng để hướng dẫn khách hàng cài đặt app Friggy</p>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center space-y-4 p-6 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="w-48 h-48 bg-white p-3 rounded-2xl border-2 border-dashed border-teal-300 shadow-sm flex items-center justify-center">
              <img
                src={generalConfig.qrImageUrl || defaultQrCode}
                alt="App Download QR Code"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="text-center space-y-1">
              <p className="text-xs font-black text-slate-800">Friggy Smart Fridge Mobile App</p>
              <p className="text-[11px] text-slate-500">Quét mã bằng camera điện thoại Android để tải APK</p>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <a
              href="https://friggy.vn"
              target="_blank"
              rel="noreferrer"
              className="w-full py-3 rounded-2xl bg-teal-50 hover:bg-teal-100 text-teal-800 font-extrabold text-xs transition-all flex items-center justify-center gap-2 border border-teal-200"
            >
              <ExternalLink className="w-4 h-4 text-teal-600" />
              <span>Mở Trang Giới Thiệu Khách Hàng</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManagerSettings;
