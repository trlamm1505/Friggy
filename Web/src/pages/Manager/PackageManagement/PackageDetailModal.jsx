import React from 'react';
import { X, Package, Check, Sparkles, Shield, DollarSign, Cpu, Users } from 'lucide-react';

export const PackageDetailModal = ({ isOpen, onClose, pkg }) => {
  if (!isOpen || !pkg) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate__animated animate__fadeIn animate__faster">
      <div className="w-full max-w-lg bg-white rounded-[36px] shadow-2xl border border-slate-100 overflow-hidden relative animate__animated animate__zoomIn animate__faster">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-teal-50 via-emerald-50 to-teal-100/50">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-md">
              <Package className="w-5.5 h-5.5" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-lg flex items-center gap-1.5">
                <span>{pkg.displayName || pkg.name}</span>
                <span className="px-2 py-0.5 rounded-md bg-teal-200 text-teal-800 text-[10px] font-extrabold uppercase">
                  {pkg.code || 'PLAN'}
                </span>
              </h3>
              <p className="text-xs text-teal-800 font-bold">
                {pkg.priceVnd > 0 ? `${Number(pkg.priceVnd).toLocaleString('vi-VN')} đ / tháng` : 'Miễn Phí Trọn Đời'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-white/80 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {pkg.description && (
            <p className="text-xs font-semibold text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
              {pkg.description}
            </p>
          )}

          {/* Quick Specs Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-teal-600" /> Giá niêm yết
              </span>
              <p className="font-black text-teal-700 text-sm">
                {pkg.priceVnd > 0 ? `${Number(pkg.priceVnd).toLocaleString('vi-VN')} đ` : '0 đ'}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                <Cpu className="w-3.5 h-3.5 text-purple-600" /> Quota AI / Tuần
              </span>
              <p className="font-black text-slate-900 text-sm">
                {pkg.aiUsagePerWeek >= 0 ? `${pkg.aiUsagePerWeek} lượt` : 'Không giới hạn'}
              </p>
            </div>
          </div>

          {/* Features List */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
              Tính Năng & Quyền Lợi Đi Kèm
            </h4>
            <div className="space-y-2">
              {Array.isArray(pkg.features) && pkg.features.length > 0 ? (
                pkg.features.map((feat, idx) => (
                  <div key={idx} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-teal-50/40 border border-teal-100/60 text-xs font-semibold text-slate-800">
                    <div className="w-4 h-4 rounded-full bg-teal-500 text-white flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                    <span>{feat}</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400">Chưa có danh sách tính năng cụ thể.</p>
              )}
            </div>
          </div>

          {/* Admin restriction notice */}
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium flex items-start gap-2">
            <Shield className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              <strong>Lưu ý:</strong> Chức năng tạo, sửa đổi bảng giá hoặc xóa gói cước thuộc quyền hạn của <strong>Super Admin</strong>. Manager có quyền tra cứu và tư vấn thông tin gói cho khách hàng.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-2xl bg-slate-900 text-white font-extrabold text-xs hover:bg-slate-800 transition-all cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default PackageDetailModal;
