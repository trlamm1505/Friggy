import React, { useState, useEffect } from 'react';
import { X, Package, Check, Plus, Trash2, Save } from 'lucide-react';

export const AddEditPackageModal = ({ packageItem, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    price: 0,
    billingCycle: 'Tháng',
    description: '',
    badgeText: '',
    popular: false,
    color: 'emerald',
    status: 'Active',
    features: [''],
  });

  useEffect(() => {
    if (packageItem) {
      setFormData({
        name: packageItem.name || '',
        code: packageItem.code || '',
        price: packageItem.price || 0,
        billingCycle: packageItem.billingCycle || 'Tháng',
        description: packageItem.description || '',
        badgeText: packageItem.badgeText || '',
        popular: packageItem.popular || false,
        color: packageItem.color || 'emerald',
        status: packageItem.status || 'Active',
        features: packageItem.features && packageItem.features.length > 0 ? packageItem.features : [''],
      });
    }
  }, [packageItem]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleFeatureChange = (index, value) => {
    const updated = [...formData.features];
    updated[index] = value;
    setFormData((prev) => ({ ...prev, features: updated }));
  };

  const handleAddFeatureField = () => {
    setFormData((prev) => ({ ...prev, features: [...prev.features, ''] }));
  };

  const handleRemoveFeatureField = (index) => {
    if (formData.features.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return alert('Vui lòng nhập tên gói dịch vụ');

    onSave({
      id: packageItem ? packageItem.id : Date.now().toString(),
      subscribersCount: packageItem ? packageItem.subscribersCount : 0,
      ...formData,
      price: Number(formData.price),
      features: formData.features.filter((f) => f.trim() !== ''),
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate__animated animate__fadeIn animate__faster">
      <div
        className="w-full max-w-xl bg-white rounded-[36px] shadow-2xl border border-slate-100 overflow-hidden relative max-h-[90vh] flex flex-col animate__animated animate__zoomIn animate__faster"
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">
                {packageItem ? 'Chỉnh Sửa Gói Dịch Vụ' : 'Thêm Gói Dịch Vụ Mới'}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Cấu hình quyền lợi, giá cả và chu kỳ thanh toán
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Tên Gói Cước
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="VD: Gói Premium Cá Nhân"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Mã Code Gói
              </label>
              <input
                type="text"
                name="code"
                value={formData.code}
                onChange={handleChange}
                required
                placeholder="VD: PREMIUM_IND"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Giá Bán (VNĐ)
              </label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                required
                min="0"
                step="1000"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Chu Kỳ Thanh Toán
              </label>
              <select
                name="billingCycle"
                value={formData.billingCycle}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all cursor-pointer"
              >
                <option value="Tháng">Hàng Tháng (Tháng)</option>
                <option value="Năm">Hàng Năm (Năm)</option>
                <option value="Vĩnh viễn">Vĩnh viễn (Free)</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Mô Tả Gói Cước
            </label>
            <input
              type="text"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Nhập mô tả ngắn gọn về lợi ích..."
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Badge Nhãn Nổi Bật (Nếu có)
              </label>
              <input
                type="text"
                name="badgeText"
                value={formData.badgeText}
                onChange={handleChange}
                placeholder="VD: 🔥 Phổ biến nhất"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Trạng Thái Kích Hoạt
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all cursor-pointer"
              >
                <option value="Active">Đang hiển thị (Active)</option>
                <option value="Inactive">Tạm ẩn (Inactive)</option>
              </select>
            </div>
          </div>

          {/* Features Checklist Builder */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Danh Sách Tính Năng Đi Kèm ({formData.features.length})
              </label>
              <button
                type="button"
                onClick={addFeature}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm dòng tính năng</span>
              </button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto p-1">
              {formData.features.map((feat, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 text-xs">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                  <input
                    type="text"
                    value={feat}
                    onChange={(e) => handleFeatureChange(idx, e.target.value)}
                    placeholder="VD: AI Friggy Chef gợi ý món ăn không giới hạn"
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
                  />
                  {formData.features.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeFeature(idx)}
                      className="p-2 text-slate-400 hover:text-rose-600 rounded-xl transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-lg shadow-emerald-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{packageItem ? 'Lưu Thay Đổi' : 'Tạo Gói Mới'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEditPackageModal;
