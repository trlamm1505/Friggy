import React, { useEffect, useState } from 'react';
import {
  Building2,
  Plus,
  Edit,
  Globe,
  Mail,
  CheckCircle,
  PauseCircle,
  XCircle,
  ChevronRight,
  Megaphone,
  Calendar,
  X,
  Loader2,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import {
  getSponsorsApi,
  createSponsorApi,
  updateSponsorApi,
  getSponsorCampaignsApi,
  createSponsorCampaignApi,
  updateSponsorCampaignApi,
} from '../../../services/adminService';
import { showToast } from '../../../components/common/Toast';

export const SponsorManagement = () => {
  const [sponsors, setSponsors] = useState([]);
  const [loadingSponsors, setLoadingSponsors] = useState(true);

  // Selected Sponsor for Campaigns
  const [selectedSponsor, setSelectedSponsor] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);

  // Sponsor Modals State
  const [openSponsorModal, setOpenSponsorModal] = useState(false);
  const [editingSponsor, setEditingSponsor] = useState(null);
  const [sponsorForm, setSponsorForm] = useState({
    name: '',
    websiteUrl: '',
    contactEmail: '',
    status: 'active',
  });

  // Campaign Modals State
  const [openCampaignModal, setOpenCampaignModal] = useState(false);
  const [campaignForm, setCampaignForm] = useState({
    title: 'Flash Sale Ưu Đãi 2026',
    description: '',
    campaignType: 'banner', // 'banner' | 'recipe_highlight' | 'ingredient_promo'
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    status: 'scheduled', // 'scheduled' | 'active' | 'ended'
  });

  // Fetch Sponsors
  const fetchSponsors = async () => {
    setLoadingSponsors(true);
    try {
      const res = await getSponsorsApi();
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setSponsors(list);
    } catch (err) {
      console.error('Lỗi khi tải danh sách Sponsors:', err);
      showToast.error(err.message || 'Không thể tải danh sách Nhà tài trợ');
    } finally {
      setLoadingSponsors(false);
    }
  };

  useEffect(() => {
    fetchSponsors();
  }, []);

  // Fetch Campaigns when sponsor is selected
  const fetchCampaigns = async (sponsorId) => {
    setLoadingCampaigns(true);
    try {
      const res = await getSponsorCampaignsApi(sponsorId);
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setCampaigns(list);
    } catch (err) {
      console.error('Lỗi khi tải Campaigns:', err);
      showToast.error(err.message || 'Không thể tải các chiến dịch');
    } finally {
      setLoadingCampaigns(false);
    }
  };

  const handleSelectSponsor = (sp) => {
    setSelectedSponsor(sp);
    fetchCampaigns(sp.id);
  };

  // Open Create / Edit Sponsor Modal
  const handleOpenSponsorModal = (sp = null) => {
    if (sp) {
      setEditingSponsor(sp);
      setSponsorForm({
        name: sp.name || '',
        websiteUrl: sp.websiteUrl || '',
        contactEmail: sp.contactEmail || '',
        status: sp.status || 'active',
      });
    } else {
      setEditingSponsor(null);
      setSponsorForm({ name: '', websiteUrl: '', contactEmail: '', status: 'active' });
    }
    setOpenSponsorModal(true);
  };

  // Save Sponsor (Create or Update)
  const handleSaveSponsor = async (e) => {
    e.preventDefault();
    if (!sponsorForm.name.trim()) {
      showToast.error('Vui lòng nhập tên Nhà tài trợ');
      return;
    }
    try {
      if (editingSponsor) {
        await updateSponsorApi(editingSponsor.id, sponsorForm);
        showToast.success('Đã cập nhật Nhà tài trợ!');
      } else {
        await createSponsorApi(sponsorForm);
        showToast.success('Đã tạo Nhà tài trợ mới!');
      }
      setOpenSponsorModal(false);
      fetchSponsors();
    } catch (err) {
      showToast.error(err.message || 'Lưu Nhà tài trợ thất bại');
    }
  };

  // Create Campaign for Selected Sponsor
  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    if (!selectedSponsor) return;
    try {
      await createSponsorCampaignApi(selectedSponsor.id, campaignForm);
      showToast.success('Đã tạo Chiến dịch mới!');
      setOpenCampaignModal(false);
      fetchCampaigns(selectedSponsor.id);
    } catch (err) {
      showToast.error(err.message || 'Tạo chiến dịch thất bại');
    }
  };

  // Toggle/Update Campaign Status
  const handleToggleCampaignStatus = async (campaign, newStatus) => {
    try {
      await updateSponsorCampaignApi(campaign.id, { status: newStatus });
      showToast.success(`Đã đổi trạng thái chiến dịch sang ${newStatus}`);
      fetchCampaigns(selectedSponsor.id);
    } catch (err) {
      showToast.error(err.message || 'Đổi trạng thái chiến dịch thất bại');
    }
  };

  return (
    <div className="space-y-6 pb-12 animate__animated animate__fadeIn animate__faster">
      {/* Top Header Card */}
      <div className="p-6 rounded-[32px] bg-white border border-slate-100 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Building2 className="w-6 h-6 text-emerald-600" />
            Quản Lý Nhà Tài Trợ & Chiến Dịch Quảng Cáo
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Tạo đối tác liên kết (ShopeeFood, GrabMart, WinMart...), chạy chiến dịch banner khuyến mãi và quảng cáo nguyên liệu
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchSponsors}
            className="p-3 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-2xl border border-slate-200 transition-colors cursor-pointer"
            title="Làm mới"
          >
            <RefreshCw className={`w-4 h-4 ${loadingSponsors ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => handleOpenSponsorModal(null)}
            className="px-4 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Nhà Tài Trợ</span>
          </button>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Sponsors List */}
        <div className="lg:col-span-1 p-6 rounded-[32px] bg-white border border-slate-100 shadow-md space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="font-black text-slate-900 text-sm">Danh Sách Đối Tác ({sponsors.length})</h3>
          </div>

          {loadingSponsors ? (
            <div className="py-12 text-center text-slate-400 font-semibold text-xs flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
              <p>Đang tải danh sách...</p>
            </div>
          ) : sponsors.length === 0 ? (
            <div className="py-8 text-center text-slate-400 font-semibold text-xs">Chưa có Nhà tài trợ nào.</div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {sponsors.map((sp) => {
                const isSelected = selectedSponsor?.id === sp.id;
                const status = sp.status || 'active';
                return (
                  <div
                    key={sp.id}
                    onClick={() => handleSelectSponsor(sp)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer relative group ${
                      isSelected
                        ? 'bg-emerald-50/70 border-emerald-300 shadow-md ring-2 ring-emerald-500/10'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-black text-slate-900 text-xs group-hover:text-emerald-700 transition-colors">
                        {sp.name}
                      </h4>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenSponsorModal(sp);
                          }}
                          className="p-1 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-emerald-100/50 transition-colors"
                          title="Sửa Nhà tài trợ"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1 text-[11px] text-slate-500 font-medium">
                      {sp.websiteUrl && (
                        <p className="flex items-center gap-1 text-emerald-600 truncate">
                          <Globe className="w-3 h-3 shrink-0" />
                          <a href={sp.websiteUrl} target="_blank" rel="noreferrer" className="hover:underline truncate">
                            {sp.websiteUrl}
                          </a>
                        </p>
                      )}
                      {sp.contactEmail && (
                        <p className="flex items-center gap-1 truncate">
                          <Mail className="w-3 h-3 shrink-0" />
                          <span className="truncate">{sp.contactEmail}</span>
                        </p>
                      )}
                    </div>

                    <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-100">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          status === 'active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : status === 'paused'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {status}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 flex items-center gap-0.5">
                        Xem Campaigns <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Campaigns List for Selected Sponsor */}
        <div className="lg:col-span-2 p-6 rounded-[32px] bg-white border border-slate-100 shadow-md space-y-4">
          {!selectedSponsor ? (
            <div className="py-24 text-center text-slate-400 font-semibold text-xs flex flex-col items-center justify-center gap-3">
              <Megaphone className="w-12 h-12 text-slate-300" />
              <p>Chọn một Nhà tài trợ ở danh sách bên trái để xem các Chiến dịch quảng cáo tương ứng.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4 gap-3">
                <div>
                  <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                    <Megaphone className="w-5 h-5 text-emerald-600" />
                    Chiến Dịch Quảng Cáo: {selectedSponsor.name}
                  </h3>
                  <p className="text-xs text-slate-500">Quản lý banner, recipe highlight và chương trình ưu đãi</p>
                </div>

                <button
                  onClick={() => setOpenCampaignModal(true)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all self-start sm:self-auto"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tạo Chiến Dịch Mới</span>
                </button>
              </div>

              {loadingCampaigns ? (
                <div className="py-16 text-center text-slate-400 font-semibold text-xs flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                  <p>Đang tải danh sách Chiến dịch...</p>
                </div>
              ) : campaigns.length === 0 ? (
                <div className="py-12 text-center text-slate-400 font-semibold text-xs">
                  Nhà tài trợ này chưa có chiến dịch quảng cáo nào.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {campaigns.map((cmp) => {
                    const status = cmp.status || 'scheduled';
                    return (
                      <div
                        key={cmp.id}
                        className="p-5 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 shadow-2xs space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-mono text-[10px] font-bold border border-emerald-100">
                            {cmp.campaignType}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              status === 'active'
                                ? 'bg-emerald-600 text-white'
                                : status === 'scheduled'
                                ? 'bg-amber-500 text-white'
                                : 'bg-slate-400 text-white'
                            }`}
                          >
                            {status}
                          </span>
                        </div>

                        <div>
                          <h4 className="font-black text-slate-900 text-sm">{cmp.title}</h4>
                          {cmp.description && (
                            <p className="text-xs text-slate-500 font-medium line-clamp-2 mt-1">{cmp.description}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-slate-500 font-semibold pt-2 border-t border-slate-100">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                            {cmp.startDate ? new Date(cmp.startDate).toLocaleDateString('vi-VN') : 'N/A'}
                          </span>
                          <span>→</span>
                          <span>{cmp.endDate ? new Date(cmp.endDate).toLocaleDateString('vi-VN') : 'N/A'}</span>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2">
                          {status !== 'active' && (
                            <button
                              onClick={() => handleToggleCampaignStatus(cmp, 'active')}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-bold hover:bg-emerald-700"
                            >
                              Kích Hoạt
                            </button>
                          )}
                          {status === 'active' && (
                            <button
                              onClick={() => handleToggleCampaignStatus(cmp, 'ended')}
                              className="px-2.5 py-1 rounded-lg bg-slate-200 text-slate-700 text-[11px] font-bold hover:bg-slate-300"
                            >
                              Kết Thúc
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* CREATE / EDIT SPONSOR MODAL */}
      {openSponsorModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-[32px] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-black text-slate-900 text-base">
                {editingSponsor ? 'Sửa Thông Tin Nhà Tài Trợ' : 'Thêm Nhà Tài Trợ Mới'}
              </h3>
              <button onClick={() => setOpenSponsorModal(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSponsor} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Tên Nhà tài trợ</label>
                <input
                  type="text"
                  value={sponsorForm.name}
                  onChange={(e) => setSponsorForm({ ...sponsorForm, name: e.target.value })}
                  placeholder="e.g. Shopee Food, GrabMart"
                  className="w-full p-2.5 border rounded-xl bg-slate-50 font-bold"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">URL Website (Optional)</label>
                <input
                  type="url"
                  value={sponsorForm.websiteUrl}
                  onChange={(e) => setSponsorForm({ ...sponsorForm, websiteUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full p-2.5 border rounded-xl bg-slate-50"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Email Liên Hệ (Optional)</label>
                <input
                  type="email"
                  value={sponsorForm.contactEmail}
                  onChange={(e) => setSponsorForm({ ...sponsorForm, contactEmail: e.target.value })}
                  placeholder="contact@sponsor.com"
                  className="w-full p-2.5 border rounded-xl bg-slate-50"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Trạng Thái</label>
                <select
                  value={sponsorForm.status}
                  onChange={(e) => setSponsorForm({ ...sponsorForm, status: e.target.value })}
                  className="w-full p-2.5 border rounded-xl bg-slate-50 font-bold"
                >
                  <option value="active">Active (Đang hợp tác)</option>
                  <option value="paused">Paused (Tạm dừng)</option>
                  <option value="terminated">Terminated (Chấm dứt)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setOpenSponsorModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 font-bold text-slate-700"
                >
                  Hủy
                </button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-emerald-600 font-bold text-white shadow-md">
                  Lưu Thông Tin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE CAMPAIGN MODAL */}
      {openCampaignModal && selectedSponsor && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-[32px] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-black text-slate-900 text-base">Tạo Chiến Dịch Quảng Cáo Mới</h3>
                <p className="text-xs text-emerald-700 font-bold">Đối tác: {selectedSponsor.name}</p>
              </div>
              <button onClick={() => setOpenCampaignModal(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCampaign} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Tiêu đề chiến dịch</label>
                <input
                  type="text"
                  value={campaignForm.title}
                  onChange={(e) => setCampaignForm({ ...campaignForm, title: e.target.value })}
                  placeholder="e.g. Flash Sale Tết 2026"
                  className="w-full p-2.5 border rounded-xl bg-slate-50 font-bold"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Loại chiến dịch</label>
                <select
                  value={campaignForm.campaignType}
                  onChange={(e) => setCampaignForm({ ...campaignForm, campaignType: e.target.value })}
                  className="w-full p-2.5 border rounded-xl bg-slate-50 font-bold"
                >
                  <option value="banner">Banner Quảng Cáo</option>
                  <option value="recipe_highlight">Recipe Highlight (Nổi bật công thức)</option>
                  <option value="ingredient_promo">Ingredient Promo (Ưu đãi nguyên liệu)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Ngày Bắt Đầu</label>
                  <input
                    type="date"
                    value={campaignForm.startDate}
                    onChange={(e) => setCampaignForm({ ...campaignForm, startDate: e.target.value })}
                    className="w-full p-2.5 border rounded-xl bg-slate-50 font-semibold"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Ngày Kết Thúc</label>
                  <input
                    type="date"
                    value={campaignForm.endDate}
                    onChange={(e) => setCampaignForm({ ...campaignForm, endDate: e.target.value })}
                    className="w-full p-2.5 border rounded-xl bg-slate-50 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Mô tả chi tiết (Optional)</label>
                <textarea
                  rows={3}
                  value={campaignForm.description}
                  onChange={(e) => setCampaignForm({ ...campaignForm, description: e.target.value })}
                  placeholder="Mô tả chương trình ưu đãi..."
                  className="w-full p-2.5 border rounded-xl bg-slate-50"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setOpenCampaignModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 font-bold text-slate-700"
                >
                  Hủy
                </button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-emerald-600 font-bold text-white shadow-md">
                  Tạo Chiến Dịch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SponsorManagement;
