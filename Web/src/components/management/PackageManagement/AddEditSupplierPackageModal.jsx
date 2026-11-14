import React, { useState, useEffect } from 'react';
import { X, Package, Check, Save } from 'lucide-react';
import { showToast } from '../../common/Toast';

export const AddEditSupplierPackageModal = ({ packageItem, onClose, onSave, isSubmitting = false }) => {
  const isEditing = Boolean(packageItem?.id);

  const [formData, setFormData] = useState({
    name: '',
    displayName: '',
    priceVnd: 299000,
    billingCycle: 'monthly',
    maxIngredients: 50,
    featuresText: 'Tối đa 50 nguyên liệu\nHỗ trợ email\nHiển thị ưu tiên khi đề xuất nguyên liệu',
    isActive: true,
  });

  useEffect(() => {
    if (packageItem) {
      setFormData({
        name: packageItem.name || '',
        displayName: packageItem.displayName || '',
        priceVnd: packageItem.priceVnd !== undefined ? packageItem.priceVnd : 0,
        billingCycle: packageItem.billingCycle || 'monthly',
        maxIngredients: packageItem.maxIngredients !== undefined ? packageItem.maxIngredients : 50,
        featuresText: Array.isArray(packageItem.features)
          ? packageItem.features.join('\n')
          : typeof packageItem.features === 'string'
          ? packageItem.features
          : '',
        isActive: packageItem.isActive ?? true,
      });
    }
  }, [packageItem]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.displayName.trim()) {
      showToast.error('Vui lòng nhập tên hiển thị của gói cước');
      return;
    }
    if (!isEditing && !formData.name.trim()) {
      showToast.error('Vui lòng nhập slug định danh của gói (ví dụ: basic, pro, enterprise)');
      return;
    }

    const features = formData.featuresText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    const payload = {
      displayName: formData.displayName.trim(),
      priceVnd: Number(formData.priceVnd),
      maxIngredients: Number(formData.maxIngredients),
      features,
      isActive: Boolean(formData.isActive),
    };

    if (!isEditing) {
      payload.name = formData.name.trim().toLowerCase();
      payload.billingCycle = formData.billingCycle;
    }

    onSave(payload);
  };

  return (
    <div className="fixed inset-0 z-50 bg-emerald-950/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-[32px] max-w-lg w-full p-6 sm:p-8 shadow-2xl relative border border-emerald-100 animate__animated animate__zoomIn animate__faster max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-emerald-100 text-emerald-700 rounded-2xl">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900">
              {isEditing ? 'Cập Nhật Gói Cước Đối Tác' : 'Tạo Gói Cước Đối Tác Mới'}
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Cấu hình giá niêm yết, quyền lợi và giới hạn sản phẩm cho nhà cung cấp.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Slug định danh (mã gói, không dấu) {!isEditing && <span className="text-rose-500">*</span>}
            </label>
            <input
              type="text"
              value={formData.name}
              disabled={isEditing}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ví dụ: basic, pro, enterprise"
              required={!isEditing}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all disabled:opacity-50 disabled:bg-slate-100"
            />
            {isEditing && (
              <p className="text-[11px] text-slate-400 mt-1">
                Slug định danh không thể thay đổi sau khi tạo để bảo toàn tính nhất quán.
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Tên hiển thị <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              placeholder="Ví dụ: Gói Cơ Bản, Gói Nâng Cao"
              required
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Giá cước (VND) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min={0}
                step={1000}
                value={formData.priceVnd}
                onChange={(e) => setFormData({ ...formData, priceVnd: e.target.value })}
                required
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Chu kỳ thanh toán
              </label>
              <select
                value={formData.billingCycle}
                disabled={isEditing}
                onChange={(e) => setFormData({ ...formData, billingCycle: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all disabled:opacity-50 disabled:bg-slate-100"
              >
                <option value="monthly">Hàng tháng (Monthly)</option>
                <option value="yearly">Hàng năm (Yearly)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Giới hạn nguyên liệu tối đa
            </label>
            <input
              type="number"
              min={1}
              value={formData.maxIngredients}
              onChange={(e) => setFormData({ ...formData, maxIngredients: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Danh sách tính năng & quyền lợi (Mỗi dòng 1 tính năng)
            </label>
            <textarea
              rows={4}
              value={formData.featuresText}
              onChange={(e) => setFormData({ ...formData, featuresText: e.target.value })}
              placeholder="Thêm tối đa 200 nguyên liệu&#10;Hỗ trợ import Excel&#10;Hỗ trợ 24/7"
              className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>

          <div className="flex items-center gap-2.5 pt-1">
            <input
              type="checkbox"
              id="planIsActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 rounded border-slate-300 cursor-pointer"
            />
            <label htmlFor="planIsActive" className="text-xs sm:text-sm font-bold text-slate-700 cursor-pointer">
              Kích hoạt gói cước ngay (hiển thị cho đối tác mua)
            </label>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 via-green-600 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-emerald-500/20 transition-all cursor-pointer flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Đang lưu...' : isEditing ? 'Cập nhật' : 'Tạo gói mới'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEditSupplierPackageModal;

