import React, { useState, useEffect } from 'react';
import {
  Utensils,
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  AlertCircle,
  X,
  FileSpreadsheet,
  Lock,
  Image as ImageIcon,
} from 'lucide-react';
import {
  getSupplierIngredientsApi,
  getSupplierProfileApi,
  createSupplierIngredientApi,
  updateSupplierIngredientApi,
  deleteSupplierIngredientApi,
  importSupplierIngredientsApi,
  downloadSupplierIngredientsTemplateApi,
  getIngredientCategoriesApi,
} from '../../../services/supplierService';
import { showToast } from '../../../components/common/Toast';
import { API_BASE_URL } from '../../../utils/constants';

const resolveImageUrl = (path) => {
  if (!path) return null;
  let url = String(path).trim();
  if (url.startsWith('blob:') || url.startsWith('data:')) {
    return url;
  }
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    const base = (API_BASE_URL || '').replace(/\/api\/v1\/?$/, '');
    url = `${base}${url.startsWith('/') ? '' : '/'}${url}`;
  }
  if (url.includes('ngrok') && !url.includes('ngrok-skip-browser-warning')) {
    const sep = url.includes('?') ? '&' : '?';
    url = `${url}${sep}ngrok-skip-browser-warning=true`;
  }
  return url;
};

export const SupplierIngredients = () => {
  const [ingredients, setIngredients] = useState([]);
  const [categories, setCategories] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Search & Filter & Pagination
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [total, setTotal] = useState(0);

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [viewingItem, setViewingItem] = useState(null);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    categoryId: '',
    defaultUnit: 'kg',
    caloriesPer100g: '',
    averagePricePerUnit: '',
    brand: '',
    barcode: '',
    description: '',
  });

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadCategories();
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const res = await getSupplierProfileApi();
      setProfile(res?.data || res);
    } catch (e) {
      setProfile(null);
    }
  };

  const isVerified = Boolean(profile?.isVerified);

  useEffect(() => {
    loadIngredients();
  }, [page, statusFilter]);

  const loadCategories = async () => {
    try {
      const res = await getIngredientCategoriesApi();
      // axiosClient unwrap 1 lần: res = body
      // Body có thể là: [...] | { data: [...] } | { data: { data: [...] } }
      const raw = Array.isArray(res)
        ? res
        : Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.data?.data)
        ? res.data.data
        : [];
      // Flatten tree nếu có children (category tree)
      const flatten = (list) => {
        const result = [];
        for (const cat of list) {
          result.push(cat);
          if (Array.isArray(cat.children) && cat.children.length > 0) {
            result.push(...flatten(cat.children));
          }
        }
        return result;
      };
      setCategories(flatten(raw));
    } catch (e) {
      console.warn('Không thể load categories:', e);
    }
  };

  const loadIngredients = async () => {
    setLoading(true);
    try {
      const params = { page, limit };
      if (statusFilter) params.status = statusFilter;
      const res = await getSupplierIngredientsApi(params);
      const resBody = res?.data !== undefined ? res.data : res;

      // Trích xuất linh hoạt mảng nguyên liệu từ mọi định dạng response của Backend NestJS
      // (Backend supplier/ingredients trả về { data: [...], total, page, limit })
      const rawList = Array.isArray(resBody)
        ? resBody
        : Array.isArray(resBody?.data)
        ? resBody.data
        : Array.isArray(resBody?.items)
        ? resBody.items
        : Array.isArray(res?.data)
        ? res.data
        : [];

      const totalCount =
        resBody?.total ??
        resBody?.meta?.total ??
        res?.total ??
        rawList.length;

      setIngredients(rawList);
      setTotal(totalCount);
    } catch (err) {
      showToast.error(err.message || 'Không thể tải danh sách nguyên liệu');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    if (!isVerified) {
      showToast.warning('Hồ sơ doanh nghiệp đang chờ Admin xét duyệt. Tính năng thêm nguyên liệu hiện đang tạm khóa.');
      return;
    }
    setEditingItem(null);
    setFormData({
      name: '',
      categoryId: categories[0]?.id || '',
      defaultUnit: 'kg',
      caloriesPer100g: '',
      averagePricePerUnit: '',
      brand: '',
      barcode: '',
      description: '',
    });
    setImageFile(null);
    setImagePreview(null);
    setModalOpen(true);
  };

  const handleOpenImport = () => {
    if (!isVerified) {
      showToast.warning('Hồ sơ doanh nghiệp đang chờ Admin xét duyệt. Tính năng nhập Excel hiện đang tạm khóa.');
      return;
    }
    setImportModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name || '',
      categoryId: item.categoryId || categories[0]?.id || '',
      defaultUnit: item.defaultUnit || 'kg',
      caloriesPer100g: item.caloriesPer100g ?? '',
      averagePricePerUnit: item.averagePricePerUnit ?? '',
      brand: item.brand || '',
      barcode: item.barcode || '',
      description: item.description || '',
    });
    setImageFile(null);
    setImagePreview(item.imagePath ? resolveImageUrl(item.imagePath) : null);
    setModalOpen(true);
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast.error('Dung lượng ảnh không được vượt quá 5MB');
      return;
    }

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      showToast.error('Định dạng ảnh không hợp lệ. Vui lòng chọn file JPEG, PNG hoặc WEBP');
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast.error('Vui lòng nhập tên nguyên liệu');
      return;
    }
    if (!formData.categoryId) {
      showToast.error('Vui lòng chọn danh mục nguyên liệu');
      return;
    }

    if (formData.averagePricePerUnit && Number(formData.averagePricePerUnit) < 0) {
      showToast.error('Đơn giá không được là số âm');
      return;
    }
    if (formData.caloriesPer100g && Number(formData.caloriesPer100g) < 0) {
      showToast.error('Lượng calo không được là số âm');
      return;
    }

    setSubmitting(true);
    showToast.info(editingItem ? 'Đang cập nhật nguyên liệu...' : 'Đang gửi nguyên liệu lên máy chủ...');
    try {
      if (editingItem) {
        const payload = {
          name: formData.name.trim(),
          categoryId: Number(formData.categoryId),
          defaultUnit: formData.defaultUnit.trim(),
          caloriesPer100g: formData.caloriesPer100g ? Number(formData.caloriesPer100g) : undefined,
          averagePricePerUnit: formData.averagePricePerUnit ? Number(formData.averagePricePerUnit) : undefined,
          brand: formData.brand?.trim() || undefined,
          barcode: formData.barcode?.trim() || undefined,
          description: formData.description?.trim() || undefined,
        };
        await updateSupplierIngredientApi(editingItem.id, payload);
        showToast.success('Cập nhật nguyên liệu thành công!');
      } else {
        const fd = new FormData();
        fd.append('name', formData.name.trim());
        fd.append('categoryId', String(formData.categoryId));
        fd.append('defaultUnit', formData.defaultUnit.trim());
        if (formData.caloriesPer100g) fd.append('caloriesPer100g', String(formData.caloriesPer100g));
        if (formData.averagePricePerUnit) fd.append('averagePricePerUnit', String(formData.averagePricePerUnit));
        if (formData.brand?.trim()) fd.append('brand', formData.brand.trim());
        if (formData.barcode?.trim()) fd.append('barcode', formData.barcode.trim());
        if (formData.description?.trim()) fd.append('description', formData.description.trim());
        if (imageFile) {
          fd.append('image', imageFile);
        }

        await createSupplierIngredientApi(fd);
        showToast.success('Tạo nguyên liệu thành công! Trạng thái: Chờ duyệt.');
      }

      setModalOpen(false);
      setImageFile(null);
      setImagePreview(null);
      loadIngredients();
    } catch (err) {
      showToast.error(err.message || 'Lỗi khi lưu nguyên liệu');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (item) => {
    setDeleteConfirmItem(item);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmItem) return;
    setDeleting(true);
    showToast.info('Đang thực hiện xóa nguyên liệu...');
    try {
      await deleteSupplierIngredientApi(deleteConfirmItem.id);
      showToast.success(`Đã xóa nguyên liệu "${deleteConfirmItem.name}" thành công!`);
      setDeleteConfirmItem(null);
      loadIngredients();
    } catch (err) {
      showToast.error(err.message || 'Không thể xóa nguyên liệu');
    } finally {
      setDeleting(false);
    }
  };

  const handleDownloadTemplate = async () => {
    showToast.info('Đang tải xuống file Excel mẫu...');
    try {
      const blob = await downloadSupplierIngredientsTemplateApi();
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'supplier_ingredients_template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      showToast.success('Đã tải xuống template Excel mẫu thành công!');
    } catch (err) {
      showToast.error('Không thể tải file template: ' + (err.message || ''));
    }
  };

  const handleImportSubmit = async (e) => {
    e.preventDefault();
    if (!importFile) {
      showToast.error('Vui lòng chọn file Excel');
      return;
    }
    if (importFile.size > 5 * 1024 * 1024) {
      showToast.error('Dung lượng file Excel không được vượt quá 5MB');
      return;
    }
    setImporting(true);
    showToast.info('Đang xử lý import danh sách nguyên liệu từ Excel...');
    try {
      const fd = new FormData();
      fd.append('file', importFile);
      const res = await importSupplierIngredientsApi(fd);
      const result = res?.data || res;
      const successCount = result.success ?? result.importedCount ?? 0;
      showToast.success(`Import hoàn tất! Thành công: ${successCount} nguyên liệu.`);
      setImportModalOpen(false);
      setImportFile(null);
      loadIngredients();
    } catch (err) {
      showToast.error(err.message || 'Lỗi khi import file Excel');
    } finally {
      setImporting(false);
    }
  };

  const formatVnd = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
  };

  // Filtered by local search
  const filteredItems = ingredients.filter((it) =>
    it.name?.toLowerCase().includes(search.toLowerCase()) ||
    it.brand?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* ── Pending Verification Warning Banner ─────────────────────── */}
      {!isVerified && (
        <div className="p-5 rounded-3xl bg-amber-50 border-2 border-amber-300 text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm animate__animated animate__fadeIn">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="p-3 bg-amber-200 text-amber-900 rounded-2xl flex-shrink-0">
              <Clock className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base">Chức năng nộp nguyên liệu đang tạm khóa</h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[10px] font-black uppercase">
                  Chờ Admin duyệt
                </span>
              </div>
              <p className="text-xs text-amber-900/80 mt-1 max-w-2xl leading-relaxed">
                Hồ sơ doanh nghiệp đang được Ban quản trị thẩm định. Để bảo đảm kiểm định nguồn gốc thực phẩm, tính năng đăng nguyên liệu sẽ tự động mở khóa sau khi Admin bấm <b>Xác minh</b> hồ sơ và doanh nghiệp kích hoạt gói cước.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Top Header Toolbar ──────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-800 flex items-center gap-3">
            <Utensils className="w-6 h-6 text-emerald-600" />
            Danh mục nguyên liệu cung ứng
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Tổng cộng: <span className="font-extrabold text-emerald-700 text-sm sm:text-base">{total}</span> sản phẩm
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleDownloadTemplate}
            className="px-4 py-3 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs sm:text-sm rounded-2xl border border-slate-200 shadow-2xs transition-all flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-500" />
            Tải mẫu Excel
          </button>

          <button
            onClick={handleOpenImport}
            className="px-4 py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-bold text-xs sm:text-sm rounded-2xl border border-emerald-200 shadow-2xs transition-all flex items-center gap-2 cursor-pointer"
          >
            <Upload className="w-4 h-4 text-emerald-700" />
            Import Excel
          </button>

          <button
            onClick={handleOpenAdd}
            className={`px-5 py-3 font-black text-xs sm:text-sm rounded-2xl shadow-md transition-all flex items-center gap-2 cursor-pointer ${
              !isVerified
                ? 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                : 'bg-gradient-to-r from-emerald-500 via-green-600 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-md shadow-emerald-500/20'
            }`}
          >
            {!isVerified ? <Lock className="w-4 h-4 text-slate-500" /> : <Plus className="w-4 h-4" />}
            <span>Thêm nguyên liệu mới</span>
          </button>
        </div>
      </div>

      {/* ── Search & Filter Controls ─────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-emerald-100 p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên nguyên liệu hoặc thương hiệu..."
            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="pending">Chờ duyệt (Pending)</option>
            <option value="approved">Đã duyệt (Approved)</option>
            <option value="rejected">Bị từ chối (Rejected)</option>
            <option value="archived">Đã lưu trữ (Archived)</option>
          </select>
        </div>
      </div>

      {/* ── Table Container ─────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-emerald-100 shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-20 text-slate-400 text-sm">
            {!isVerified ? (
              <div className="max-w-md mx-auto">
                <div className="w-14 h-14 rounded-3xl bg-amber-100 text-amber-600 mx-auto flex items-center justify-center mb-3">
                  <Clock className="w-7 h-7 animate-pulse" />
                </div>
                <p className="font-bold text-slate-700 text-base">Hồ sơ doanh nghiệp đang chờ xét duyệt</p>
                <p className="text-slate-400 text-xs sm:text-sm mt-1 leading-relaxed">
                  Sau khi Admin phê duyệt hồ sơ và bạn kích hoạt gói cước dịch vụ, danh sách nguyên liệu của bạn sẽ hiển thị tại đây.
                </p>
              </div>
            ) : (
              <div>
                <Utensils className="w-14 h-14 mx-auto text-slate-300 mb-3" />
                Không tìm thấy nguyên liệu nào phù hợp.
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-emerald-50/50 border-b border-emerald-100 text-xs font-black text-slate-600 uppercase tracking-wider">
                  <th className="py-4 px-5">Tên nguyên liệu</th>
                  <th className="py-4 px-4">Danh mục</th>
                  <th className="py-4 px-4">Đơn vị</th>
                  <th className="py-4 px-4">Đơn giá</th>
                  <th className="py-4 px-4">Thương hiệu</th>
                  <th className="py-4 px-4">Trạng thái</th>
                  <th className="py-4 px-5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-emerald-50/30 transition-colors">
                    <td className="py-4 px-5 font-bold text-slate-800">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50/80 border border-emerald-200/80 overflow-hidden flex items-center justify-center shrink-0 shadow-2xs">
                          {item.imagePath ? (
                            <img
                              src={resolveImageUrl(item.imagePath)}
                              alt={item.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <Utensils className="w-5 h-5 text-emerald-500/70" />
                          )}
                        </div>
                        <div>
                          <div className="text-sm sm:text-base font-extrabold text-slate-900">{item.name}</div>
                          {item.rejectionReason && item.status === 'rejected' && (
                            <span className="text-xs text-rose-600 block mt-0.5 font-semibold">
                              Lý do: {item.rejectionReason}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-slate-600 font-medium">
                      {item.category?.name ||
                        categories.find(
                          (c) => String(c.id) === String(item.categoryId)
                        )?.name ||
                        '—'}
                    </td>
                    <td className="py-4 px-4 font-semibold text-slate-700">{item.defaultUnit}</td>
                    <td className="py-4 px-4 font-black text-emerald-700 text-sm sm:text-base">
                      {formatVnd(item.averagePricePerUnit)}
                    </td>
                    <td className="py-4 px-4 text-slate-500 font-medium">{item.brand || '—'}</td>
                    <td className="py-4 px-4">
                      {item.status === 'approved' ? (
                        <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
                          Đã duyệt
                        </span>
                      ) : item.status === 'rejected' ? (
                        <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200 inline-flex items-center gap-1">
                          Bị từ chối
                        </span>
                      ) : (
                        <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 inline-flex items-center gap-1">
                          Chờ duyệt
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-5 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => {
                          setViewingItem(item);
                          setDetailModalOpen(true);
                        }}
                        className="p-2 hover:bg-slate-100 text-slate-600 rounded-xl transition-colors cursor-pointer inline-flex items-center"
                        title="Xem chi tiết"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {(item.status === 'pending' || item.status === 'rejected') && (
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="p-2 hover:bg-emerald-100 text-emerald-700 rounded-xl transition-colors cursor-pointer inline-flex items-center"
                          title="Sửa"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        onClick={() => handleDelete(item)}
                        className="p-2 hover:bg-rose-100 text-rose-600 rounded-xl transition-colors cursor-pointer inline-flex items-center"
                        title="Xóa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {total > limit && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Trang {page} / {Math.ceil(total / limit)}
            </span>
            <div className="space-x-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 bg-slate-100 rounded-xl hover:bg-slate-200 disabled:opacity-40 cursor-pointer"
              >
                Trước
              </button>
              <button
                disabled={page >= Math.ceil(total / limit)}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 bg-slate-100 rounded-xl hover:bg-slate-200 disabled:opacity-40 cursor-pointer"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Add / Edit Modal ─────────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-xl relative animate__animated animate__fadeInUp animate__faster max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-black text-slate-800 text-base flex items-center gap-2">
                <Utensils className="w-4 h-4 text-emerald-600" />
                {editingItem ? 'Chỉnh sửa nguyên liệu' : 'Thêm nguyên liệu mới'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Tên nguyên liệu <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ví dụ: Thịt bò Wagyu Úc"
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Danh mục <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    <option value="">-- Chọn danh mục --</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Đơn vị tính <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.defaultUnit}
                    onChange={(e) => setFormData({ ...formData, defaultUnit: e.target.value })}
                    placeholder="kg, gram, quả, hộp..."
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Giá / đơn vị (VND)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.averagePricePerUnit}
                    onChange={(e) => setFormData({ ...formData, averagePricePerUnit: e.target.value })}
                    placeholder="Ví dụ: 150000"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Calo / 100g (kcal)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={formData.caloriesPer100g}
                    onChange={(e) => setFormData({ ...formData, caloriesPer100g: e.target.value })}
                    placeholder="Ví dụ: 250"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Thương hiệu / Xuất xứ</label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    placeholder="Ví dụ: GreenFarm"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mã vạch (Barcode)</label>
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    placeholder="89385..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Hình ảnh nguyên liệu (JPG, PNG, WEBP — Tối đa 5MB)
                </label>
                <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                  <div className="w-16 h-16 rounded-xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 relative group shadow-2xs">
                    {imagePreview ? (
                      <>
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => {
                            setImageFile(null);
                            setImagePreview(null);
                          }}
                          className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          title="Xóa ảnh"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <ImageIcon className="w-6 h-6 text-slate-300" />
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      type="file"
                      id="ingredient-image-file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                    <label
                      htmlFor="ingredient-image-file"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-xl border border-emerald-200 cursor-pointer transition-colors text-xs"
                    >
                      <Upload className="w-3.5 h-3.5 text-emerald-700" />
                      <span>{imagePreview ? 'Đổi ảnh khác' : 'Tải ảnh lên'}</span>
                    </label>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Ảnh rõ nét giúp Admin dễ dàng phê duyệt và hiển thị sinh động đến khách hàng.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Mô tả sản phẩm</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Tiêu chuẩn hữu cơ, phương pháp bảo quản, ngày thu hoạch..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Đang gửi...' : editingItem ? 'Cập nhật' : 'Nộp duyệt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Import Modal ────────────────────────────────────────────── */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl relative animate__animated animate__fadeInUp animate__faster">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-black text-slate-800 text-base flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                Import danh sách nguyên liệu
              </h3>
              <button
                onClick={() => setImportModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleImportSubmit} className="space-y-4 text-xs">
              <p className="text-slate-500 leading-relaxed">
                Tải về file Excel mẫu nếu bạn chưa có cấu trúc chuẩn. Hỗ trợ file <span className="font-bold text-slate-800">.xlsx</span>, tối đa <span className="font-bold text-emerald-700">5MB</span>.
              </p>

              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200/80 text-emerald-950 text-[11px] leading-relaxed">
                <span className="font-bold block mb-0.5">💡 Tính năng nhúng ảnh thông minh:</span>
                Bạn có thể chèn ảnh sản phẩm trực tiếp vào từng dòng nguyên liệu trong file Excel. Máy chủ sẽ tự động trích xuất và hiển thị ảnh nguyên liệu tương ứng!
              </div>

              <div className="p-4 border-2 border-dashed border-emerald-300 rounded-2xl bg-emerald-50/50 flex flex-col items-center justify-center text-center">
                <input
                  type="file"
                  accept=".xlsx"
                  onChange={(e) => setImportFile(e.target.files?.[0])}
                  className="hidden"
                  id="excelFileInput"
                />
                <label
                  htmlFor="excelFileInput"
                  className="cursor-pointer flex flex-col items-center"
                >
                  <Upload className="w-8 h-8 text-emerald-600 mb-2" />
                  <span className="font-bold text-emerald-950">
                    {importFile ? importFile.name : 'Chọn file Excel từ máy tính'}
                  </span>
                  <span className="text-[11px] text-slate-400 mt-1">Dung lượng tối đa 5MB</span>
                </label>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setImportModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={importing || !importFile}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {importing ? 'Đang xử lý...' : 'Bắt đầu import'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Detail Modal ────────────────────────────────────────────── */}
      {detailModalOpen && viewingItem && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl relative animate__animated animate__fadeInUp animate__faster text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-black text-slate-800 text-base">{viewingItem.name}</h3>
              <button
                onClick={() => setDetailModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {viewingItem.imagePath && (
              <div className="w-full h-44 rounded-2xl bg-slate-50 border border-slate-200 overflow-hidden mb-4 relative">
                <img
                  src={resolveImageUrl(viewingItem.imagePath)}
                  alt={viewingItem.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            )}

            <div className="space-y-3">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Đơn vị:</span>
                <span className="font-bold text-slate-800">{viewingItem.defaultUnit}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Giá trung bình:</span>
                <span className="font-bold text-emerald-700">{formatVnd(viewingItem.averagePricePerUnit)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Calo / 100g:</span>
                <span className="font-bold text-slate-800">{viewingItem.caloriesPer100g || '—'} kcal</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Thương hiệu:</span>
                <span className="font-bold text-slate-800">{viewingItem.brand || '—'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Mã vạch:</span>
                <span className="font-bold text-slate-800">{viewingItem.barcode || '—'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Trạng thái:</span>
                <span className="font-bold text-slate-800">{viewingItem.status}</span>
              </div>
              {viewingItem.rejectionReason && (
                <div className="p-3 bg-rose-50 text-rose-800 rounded-xl border border-rose-200">
                  <span className="font-bold block">Lý do từ chối:</span>
                  {viewingItem.rejectionReason}
                </div>
              )}
              {viewingItem.description && (
                <div className="pt-2">
                  <span className="text-slate-500 block mb-1">Mô tả:</span>
                  <p className="text-slate-700 bg-slate-50 p-3 rounded-xl">{viewingItem.description}</p>
                </div>
              )}
            </div>

            <div className="pt-5 flex justify-end">
              <button
                onClick={() => setDetailModalOpen(false)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ───────────────────────────────── */}
      {deleteConfirmItem && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-xl relative animate__animated animate__fadeInUp animate__faster text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-black text-slate-800 text-base">Xác nhận xóa nguyên liệu</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Bạn có chắc chắn muốn xóa nguyên liệu <span className="font-bold text-slate-800">"{deleteConfirmItem.name}"</span> không? Hành động này sẽ chuyển trạng thái nguyên liệu sang lưu trữ.
            </p>
            <div className="mt-5 flex items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteConfirmItem(null)}
                disabled={deleting}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleting}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer disabled:opacity-50"
              >
                {deleting ? 'Đang xóa...' : 'Xác nhận xóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierIngredients;

