import React, { useState, useEffect } from 'react';
import { X, Loader2, Utensils, Flame, DollarSign, Tag, CheckCircle2 } from 'lucide-react';
import { getIngredientDetailApi } from '../../../services/ingredientService';

export const IngredientDetailModal = ({ isOpen, onClose, ingredientId }) => {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (!isOpen || !ingredientId) return;

    setImgError(false);
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await getIngredientDetailApi(ingredientId);
        setDetail(res?.data || res);
      } catch (err) {
        console.error('Lỗi khi tải chi tiết nguyên liệu:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isOpen, ingredientId]);

  if (!isOpen) return null;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-emerald-950/40 backdrop-blur-xs animate__animated animate__fadeIn animate__faster">
      <div
        className="bg-white rounded-[32px] border border-emerald-100 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate__animated animate__zoomIn animate__faster"
      >
          {/* Header */}
          <div className="p-6 border-b border-emerald-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-100/50">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-white border border-emerald-200 shadow-xs flex items-center justify-center overflow-hidden shrink-0">
                {detail?.imagePath && !imgError ? (
                  <img
                    src={detail.imagePath}
                    alt={detail.name}
                    className="w-full h-full object-cover"
                    onError={() => setImgError(true)}
                  />
                ) : (
                  <div className="w-full h-full bg-emerald-600 text-white flex items-center justify-center">
                    <Utensils className="w-5.5 h-5.5" />
                  </div>
                )}
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-lg">
                  {detail?.name || 'Chi Tiết Nguyên Liệu'}
                </h3>
                <p className="text-xs text-emerald-800 font-bold">
                  Mã ID: #{ingredientId} • Danh mục: {detail?.categoryName || 'N/A'}
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

          {/* Body */}
          <div className="p-6 space-y-6 overflow-y-auto flex-1">
            {loading ? (
              <div className="py-16 text-center space-y-3">
                <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
                <p className="text-xs font-bold text-slate-500">Đang tải dữ liệu chi tiết nguyên liệu...</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5 text-emerald-600" /> Đơn vị mặc định
                  </span>
                  <span className="text-base font-black text-slate-900 block">
                    {detail?.defaultUnit || 'N/A'}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-amber-500" /> Lượng Calo / 100g
                  </span>
                  <span className="text-base font-black text-slate-900 block">
                    {detail?.caloriesPer100g ? `${detail.caloriesPer100g} kcal` : 'N/A'}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5 text-green-600" /> Giá trung bình
                  </span>
                  <span className="text-base font-black text-emerald-700 block">
                    {detail?.averagePricePerUnit ? formatCurrency(detail.averagePricePerUnit) : 'N/A'}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Loại phổ biến
                  </span>
                  <span className="text-base font-black text-slate-900 block">
                    {detail?.isCommon ? (
                      <span className="text-emerald-700 font-extrabold">Phổ biến</span>
                    ) : (
                      <span className="text-slate-400">Thông thường</span>
                    )}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-2xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs transition-colors cursor-pointer"
            >
              Đóng
            </button>
          </div>
      </div>
    </div>
  );
};

export default IngredientDetailModal;
