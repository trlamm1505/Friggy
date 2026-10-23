import React, { useEffect, useState } from 'react';
import {
  Cpu,
  Terminal,
  Plus,
  CheckCircle,
  X,
  Trash2,
  Zap,
  Eye,
  Edit2,
  Copy,
  Check,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Code,
  Sparkles,
  Bot,
  AlertTriangle,
} from 'lucide-react';
import {
  getAiProvidersApi,
  createAiProviderApi,
  activateAiProviderApi,
  deleteAiProviderApi,
  getAiPromptsApi,
  getAiPromptDetailApi,
  createAiPromptApi,
  activateAiPromptApi,
  updateAiPromptApi,
  deleteAiPromptApi,
} from '../../../services/adminService';
import { showToast } from '../../../components/common/Toast';

const AGENT_TYPE_OPTIONS = [
  {
    value: 'chef_agent',
    label: 'Chef Agent',
    icon: '🍳',
    desc: 'Đầu bếp gợi ý thực đơn, công thức & hướng dẫn nấu ăn từ nguyên liệu',
    badgeColor: 'bg-orange-50 text-orange-700 border-orange-200',
  },
  {
    value: 'nutrition_agent',
    label: 'Nutrition Agent',
    icon: '🥗',
    desc: 'Chuyên gia tính toán calo, phân tích dinh dưỡng & chế độ ăn',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  {
    value: 'accountant_agent',
    label: 'Accountant Agent',
    icon: '💰',
    desc: 'Kế toán tối ưu chi phí đi chợ, ước tính ngân sách chi tiêu',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  {
    value: 'supervisor',
    label: 'Supervisor Agent',
    icon: '🧠',
    desc: 'Bộ não điều phối luồng xử lý và phân chia nhiệm vụ giữa các Agent',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  {
    value: 'public_chat',
    label: 'Public Chat Agent',
    icon: '💬',
    desc: 'Trợ lý tư vấn, giới thiệu tính năng Friggy cho khách vãng lai',
    badgeColor: 'bg-teal-50 text-teal-700 border-teal-200',
  },
  {
    value: 'data_agent',
    label: 'Data Agent',
    icon: '📊',
    desc: 'Trích xuất, thu thập & chuẩn hóa dữ liệu thực phẩm, nguyên liệu',
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  {
    value: 'evaluator',
    label: 'Evaluator Agent',
    icon: '⚖️',
    desc: 'Đánh giá & kiểm định chất lượng thực đơn, phản hồi của AI',
    badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
  },
];

const BEEKNOEE_MODEL_SUGGESTIONS = [
  'gemini-3.5-flash',
  'bee/gemini-3.8-flash',
  'google/gemini-3.1-flash-lite',
  'bee/gemini-3.5-flash-lite',
  'gemini-2.5-flash-lite',
  'google/gemma-4-31b-it',
];

const BEEKNOEE_DEFAULT_KEY =
  'sk-bee-15653b94d8e44a96203b7ce653b9a56dfa5cf5fdadcf1f99758fc0f83a46a2d6';

export const AiManagement = () => {
  const [activeTab, setActiveTab] = useState('providers'); // 'providers' | 'prompts'

  // Providers state
  const [providers, setProviders] = useState([]);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [openAddProviderModal, setOpenAddProviderModal] = useState(false);
  const [providerForm, setProviderForm] = useState({
    modelName: '',
  });

  // Prompts state
  const [prompts, setPrompts] = useState([]);
  const [loadingPrompts, setLoadingPrompts] = useState(true);
  const [selectedPrompt, setSelectedPrompt] = useState(null);
  const [promptDetail, setPromptDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [openAddPromptModal, setOpenAddPromptModal] = useState(false);
  const [submittingPrompt, setSubmittingPrompt] = useState(false);
  const [promptForm, setPromptForm] = useState({
    agentType: 'chef_agent',
    version: 'v1.1',
    promptContent: '',
  });

  const [editingPrompt, setEditingPrompt] = useState(null);
  const [editPromptContent, setEditPromptContent] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Fetch Providers
  const fetchProviders = async () => {
    setLoadingProviders(true);
    try {
      const res = await getAiProvidersApi();
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setProviders(list);
    } catch (err) {
      console.error('Lỗi khi tải AI Providers:', err);
      showToast.error(err.message || 'Không thể tải danh sách AI Providers');
    } finally {
      setLoadingProviders(false);
    }
  };

  // Fetch Prompts
  const fetchPrompts = async () => {
    setLoadingPrompts(true);
    try {
      const res = await getAiPromptsApi();
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setPrompts(list);
    } catch (err) {
      console.error('Lỗi khi tải System Prompts:', err);
      showToast.error(err.message || 'Không thể tải danh sách System Prompts');
    } finally {
      setLoadingPrompts(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'providers') fetchProviders();
    else fetchPrompts();
  }, [activeTab]);

  // Handle Activate Provider
  const handleActivateProvider = async (id) => {
    setActionLoadingId(`prov-act-${id}`);
    try {
      await activateAiProviderApi(id);
      showToast.success('Đã kích hoạt AI Provider thành công!');
      fetchProviders();
    } catch (err) {
      showToast.error(err.message || 'Kích hoạt provider thất bại');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Delete Provider
  const handleDeleteProvider = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa AI Provider này?')) return;
    setActionLoadingId(`prov-del-${id}`);
    try {
      await deleteAiProviderApi(id);
      showToast.success('Đã xóa AI Provider!');
      fetchProviders();
    } catch (err) {
      showToast.error(err.message || 'Xóa provider thất bại');
    } finally {
      setActionLoadingId(null);
    }
  };

  const [submittingProvider, setSubmittingProvider] = useState(false);

  // Handle Create Provider (Model)
  const handleCreateProvider = async (e) => {
    e.preventDefault();
    const model = providerForm.modelName.trim();
    if (!model) {
      showToast.error('Vui lòng nhập hoặc chọn Tên Model');
      return;
    }

    const finalApiKey =
      localStorage.getItem('friggy_ai_api_key') || BEEKNOEE_DEFAULT_KEY;

    setSubmittingProvider(true);
    try {
      const activeP = providers.find((p) => p.isActive);
      await createAiProviderApi({
        provider: activeP?.provider || 'gemini',
        modelName: model,
        apiKey: finalApiKey,
        usageNote: activeP?.usageNote || 'baseURL=https://platform.beeknoee.com/v1',
      });
      showToast.success(`Thêm Model ${model} thành công!`);
      setOpenAddProviderModal(false);
      setProviderForm({ modelName: '' });
      fetchProviders();
    } catch (err) {
      showToast.error(err.message || 'Thêm model thất bại');
    } finally {
      setSubmittingProvider(false);
    }
  };

  // Gợi ý version tiếp theo cho từng Agent
  const getSuggestedVersion = (type) => {
    const list = prompts.filter((p) => p.agentType === type);
    if (!list || list.length === 0) return 'v1.0';
    let maxMajor = 1;
    let maxMinor = 0;
    list.forEach((p) => {
      const match = (p.version || '').match(/v?(\d+)(?:\.(\d+))?/i);
      if (match) {
        const major = parseInt(match[1], 10);
        const minor = match[2] ? parseInt(match[2], 10) : 0;
        if (major > maxMajor || (major === maxMajor && minor > maxMinor)) {
          maxMajor = major;
          maxMinor = minor;
        }
      }
    });
    return `v${maxMajor}.${maxMinor + 1}`;
  };

  // Handle Create Prompt
  const handleCreatePrompt = async (e) => {
    e.preventDefault();
    if (!promptForm.promptContent.trim()) {
      showToast.error('Vui lòng nhập nội dung câu lệnh System Prompt');
      return;
    }
    setSubmittingPrompt(true);
    try {
      await createAiPromptApi({
        agentType: promptForm.agentType,
        version: promptForm.version.trim(),
        promptContent: promptForm.promptContent.trim(),
      });
      showToast.success(`Thêm System Prompt mới cho ${promptForm.agentType} thành công!`);
      setOpenAddPromptModal(false);
      setPromptForm({
        agentType: 'chef_agent',
        version: 'v1.1',
        promptContent: '',
      });
      fetchPrompts();
    } catch (err) {
      showToast.error(err.message || 'Thêm System Prompt thất bại');
    } finally {
      setSubmittingPrompt(false);
    }
  };

  // Handle View Prompt Detail
  const handleViewPrompt = async (prompt) => {
    setSelectedPrompt(prompt);
    setLoadingDetail(true);
    try {
      const res = await getAiPromptDetailApi(prompt.id);
      const data = res?.data || res;
      setPromptDetail(data);
    } catch (err) {
      showToast.error(err.message || 'Không thể lấy chi tiết prompt');
    } finally {
      setLoadingDetail(false);
    }
  };

  // Handle Activate Prompt
  const handleActivatePrompt = async (id) => {
    setActionLoadingId(`pmt-act-${id}`);
    try {
      await activateAiPromptApi(id);
      showToast.success('Đã kích hoạt System Prompt!');
      fetchPrompts();
    } catch (err) {
      showToast.error(err.message || 'Kích hoạt prompt thất bại');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Open Edit Modal
  const handleOpenEdit = async (prompt) => {
    setEditingPrompt(prompt);
    setEditPromptContent(prompt.promptContent || '');
    try {
      const res = await getAiPromptDetailApi(prompt.id);
      const data = res?.data || res;
      if (data?.promptContent) {
        setEditPromptContent(data.promptContent);
      }
    } catch (e) {}
  };

  // Handle Save Edit Prompt
  const handleSaveEditPrompt = async (e) => {
    e.preventDefault();
    if (!editingPrompt || !editPromptContent.trim()) {
      showToast.error('Nội dung System Prompt không được để trống');
      return;
    }
    setSavingEdit(true);
    try {
      await updateAiPromptApi(editingPrompt.id, {
        promptContent: editPromptContent.trim(),
      });
      showToast.success('Cập nhật nội dung System Prompt thành công!');
      if (selectedPrompt?.id === editingPrompt.id) {
        setPromptDetail((prev) => ({ ...prev, promptContent: editPromptContent.trim() }));
      }
      setEditingPrompt(null);
      fetchPrompts();
    } catch (err) {
      showToast.error(err.message || 'Cập nhật prompt thất bại (chỉ cho phép sửa prompt chưa active)');
    } finally {
      setSavingEdit(false);
    }
  };

  // Handle Delete Prompt
  const handleDeletePrompt = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa System Prompt này không?')) return;
    setActionLoadingId(`pmt-del-${id}`);
    try {
      await deleteAiPromptApi(id);
      showToast.success('Đã xóa System Prompt thành công!');
      if (selectedPrompt?.id === id) {
        setSelectedPrompt(null);
        setPromptDetail(null);
      }
      fetchPrompts();
    } catch (err) {
      showToast.error(err.message || 'Không thể xóa prompt (không thể xóa prompt đang active)');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Copy Prompt
  const handleCopyPrompt = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedPrompt(true);
    showToast.success('Đã sao chép prompt vào clipboard!');
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const activeProvider = providers.find((p) => p.isActive);

  return (
    <div className="space-y-6 pb-12 animate__animated animate__fadeIn animate__faster">
      {/* Top Header Card */}
      <div className="p-6 rounded-[32px] bg-white border border-slate-100 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Cpu className="w-6 h-6 text-emerald-600" />
            Quản Lý AI Engine & System Prompts
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Cấu hình các Provider AI (OpenAI, Gemini, DeepSeek...) và danh sách Prompt điều khiển AI Agent
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl">
          <button
            onClick={() => setActiveTab('providers')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'providers'
                ? 'bg-white text-emerald-700 shadow-xs font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>AI Providers</span>
          </button>
          <button
            onClick={() => setActiveTab('prompts')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'prompts'
                ? 'bg-white text-emerald-700 shadow-xs font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>System Prompts</span>
          </button>
        </div>
      </div>

      {/* PROVIDERS TAB CONTENT */}
      {activeTab === 'providers' && (
        <div className="p-6 rounded-[32px] bg-white border border-slate-100 shadow-md space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-slate-900">Danh Sách AI Providers ({providers.length})</h3>
              <p className="text-xs text-slate-500">Chỉ có 1 provider chính ở trạng thái Active tại một thời điểm</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchProviders}
                className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200 transition-colors"
                title="Làm mới"
              >
                <RefreshCw className={`w-4 h-4 ${loadingProviders ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setOpenAddProviderModal(true)}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-md transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm AI Provider</span>
              </button>
            </div>
          </div>

          {loadingProviders ? (
            <div className="py-16 text-center text-slate-400 font-semibold text-sm flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
              <p>Đang tải danh sách AI Provider...</p>
            </div>
          ) : providers.length === 0 ? (
            <div className="py-12 text-center text-slate-400 font-semibold text-sm">Chưa có AI Provider nào.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {providers.map((p) => {
                const isActive = p.isActive;
                return (
                  <div
                    key={p.id}
                    className={`p-5 rounded-2xl border transition-all relative ${
                      isActive
                        ? 'bg-emerald-50/60 border-emerald-300 shadow-md'
                        : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                            isActive ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          <Zap className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-black text-slate-900 capitalize">{p.providerName}</h4>
                          <p className="text-[11px] text-slate-500 font-semibold">{p.modelName}</p>
                        </div>
                      </div>

                      {isActive ? (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-2xs">
                          <CheckCircle className="w-3 h-3" /> Active
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold uppercase">
                          Inactive
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 mb-4 line-clamp-2 bg-slate-50 p-2 rounded-xl font-mono text-[11px]">
                      {p.usageNote || 'Không có ghi chú thêm'}
                    </p>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                      {!isActive && (
                        <button
                          disabled={actionLoadingId === `prov-act-${p.id}`}
                          onClick={() => handleActivateProvider(p.id)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors cursor-pointer flex items-center gap-1"
                        >
                          {actionLoadingId === `prov-act-${p.id}` ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Zap className="w-3.5 h-3.5" />
                          )}
                          <span>Kích Hoạt</span>
                        </button>
                      )}

                      {!isActive && (
                        <button
                          disabled={actionLoadingId === `prov-del-${p.id}`}
                          onClick={() => handleDeleteProvider(p.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Xóa Provider"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* PROMPTS TAB CONTENT */}
      {activeTab === 'prompts' && (
        <div className="p-6 rounded-[32px] bg-white border border-slate-100 shadow-md space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-slate-900">Danh Sách System Prompts ({prompts.length})</h3>
              <p className="text-xs text-slate-500">Quản lý câu lệnh quy định phản hồi của AI cho từng agent</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchPrompts}
                className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200 transition-colors"
                title="Làm mới"
              >
                <RefreshCw className={`w-4 h-4 ${loadingPrompts ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setOpenAddPromptModal(true)}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-md transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm System Prompt</span>
              </button>
            </div>
          </div>

          {loadingPrompts ? (
            <div className="py-16 text-center text-slate-400 font-semibold text-sm flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
              <p>Đang tải danh sách System Prompts...</p>
            </div>
          ) : prompts.length === 0 ? (
            <div className="py-12 text-center text-slate-400 font-semibold text-sm">Chưa có System Prompt nào.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[750px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4 rounded-l-xl">Agent Type</th>
                    <th className="py-3 px-4">Phiên Bản</th>
                    <th className="py-3 px-4">Thời Gian</th>
                    <th className="py-3 px-4">Trạng Thái</th>
                    <th className="py-3 px-4 rounded-r-xl text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold">
                  {prompts.map((pmt) => {
                    const isActive = pmt.isActive;
                    const agentMeta = AGENT_TYPE_OPTIONS.find((a) => a.value === pmt.agentType);
                    return (
                      <tr key={pmt.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">
                              <Bot className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{agentMeta?.label || pmt.agentType}</p>
                              <p className="text-[11px] text-slate-400 font-mono">{pmt.agentType}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-1 rounded-xl bg-slate-100 font-mono font-bold text-slate-800 text-[11px]">
                            {pmt.version?.startsWith('v') ? pmt.version : `v${pmt.version}`}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                          {pmt.activatedAt ? (
                            <span title="Thời điểm kích hoạt">
                              Kích hoạt: {new Date(pmt.activatedAt).toLocaleDateString('vi-VN')}
                            </span>
                          ) : (
                            <span title="Thời điểm tạo">
                              Tạo: {new Date(pmt.createdAt).toLocaleDateString('vi-VN')}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          {isActive ? (
                            <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-black border border-emerald-200 inline-flex items-center gap-1">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Active
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 text-[11px] font-bold">
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Xem chi tiết prompt */}
                            <button
                              onClick={() => handleViewPrompt(pmt)}
                              className="p-2 rounded-xl text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                              title="Xem toàn bộ nội dung Prompt"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* Chỉnh sửa prompt */}
                            <button
                              onClick={() => handleOpenEdit(pmt)}
                              className="p-2 rounded-xl text-slate-500 hover:text-amber-700 hover:bg-amber-50 transition-colors cursor-pointer"
                              title={isActive ? "Xem/Tạo phiên bản mới từ prompt này" : "Chỉnh sửa nội dung Prompt"}
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>

                            {/* Kích hoạt */}
                            {!isActive ? (
                              <button
                                disabled={actionLoadingId === `pmt-act-${pmt.id}`}
                                onClick={() => handleActivatePrompt(pmt.id)}
                                className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                                title="Kích hoạt thành Prompt chính thức của Agent"
                              >
                                {actionLoadingId === `pmt-act-${pmt.id}` ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Sparkles className="w-3.5 h-3.5" />
                                )}
                                <span>Kích Hoạt</span>
                              </button>
                            ) : (
                              <span
                                className="px-2 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 rounded-lg border border-emerald-200 cursor-default flex items-center gap-1"
                                title="Prompt này đang được kích hoạt chạy cho Agent"
                              >
                                <CheckCircle className="w-3 h-3 text-emerald-600" />
                                Đang chạy
                              </span>
                            )}

                            {/* Xóa */}
                            {!isActive ? (
                              <button
                                disabled={actionLoadingId === `pmt-del-${pmt.id}`}
                                onClick={() => handleDeletePrompt(pmt.id)}
                                className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Xóa Prompt này"
                              >
                                {actionLoadingId === `pmt-del-${pmt.id}` ? (
                                  <Loader2 className="w-4 h-4 animate-spin text-rose-600" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </button>
                            ) : (
                              <button
                                disabled
                                className="p-2 rounded-xl text-slate-200 cursor-not-allowed"
                                title="Không thể xóa Prompt đang Active (hãy kích hoạt phiên bản khác trước khi xóa)"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL: ADD AI MODEL */}
      {openAddProviderModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-[32px] p-6 sm:p-7 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-xs">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">Thêm Model AI Mới</h3>
                  <p className="text-xs text-slate-500">Chỉ cần nhập hoặc chọn tên Model muốn thêm</p>
                </div>
              </div>
              <button
                onClick={() => setOpenAddProviderModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProvider} className="space-y-5 text-xs">
              {/* Tên Model - TRƯỜNG DUY NHẤT CẦN NHẬP */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-black text-slate-900 text-xs">
                    Tên Model (Model ID) <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] text-slate-400">Chọn gợi ý bên dưới hoặc tự nhập</span>
                </div>
                <input
                  type="text"
                  value={providerForm.modelName}
                  onChange={(e) => setProviderForm({ modelName: e.target.value })}
                  placeholder="Ví dụ: gemini-3.5-flash hoặc bee/gemini-3.8-flash"
                  className="w-full p-3 border border-slate-200 rounded-2xl bg-slate-50 font-mono text-xs text-slate-900 font-bold focus:bg-white focus:ring-2 focus:ring-emerald-500/20 shadow-xs"
                  required
                  autoFocus
                />

                {/* Gợi ý Model từ Beeknoee AI */}
                <div className="mt-3">
                  <span className="text-[11px] font-bold text-slate-500 block mb-1.5">
                    Gợi ý model phổ biến:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {BEEKNOEE_MODEL_SUGGESTIONS.map((m) => {
                      const isMatch = providerForm.modelName === m;
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setProviderForm({ modelName: m })}
                          className={`px-2.5 py-1 rounded-xl text-[11px] font-mono font-bold transition-all cursor-pointer ${
                            isMatch
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-emerald-700'
                          }`}
                        >
                          {m}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setOpenAddProviderModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 font-bold text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submittingProvider}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-bold text-white shadow-md shadow-emerald-600/20 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  {submittingProvider && <Loader2 className="w-4 h-4 animate-spin" />}
                  Lưu Model
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD SYSTEM PROMPT */}
      {openAddPromptModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-3xl bg-white rounded-[32px] p-6 sm:p-7 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-xs">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">Thêm Phiên Bản System Prompt</h3>
                  <p className="text-xs text-slate-500">Cấu hình câu lệnh chỉ thị hành vi cho 1 trong 7 AI Agent</p>
                </div>
              </div>
              <button onClick={() => setOpenAddPromptModal(false)} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePrompt} className="space-y-4 text-xs">
              {/* Agent Selection Grid */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="font-bold text-slate-800 text-xs">
                    1. Chọn AI Agent cần áp dụng <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] text-slate-400">
                    Hệ thống có 7 Agent chuyên trách cố định
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1">
                  {AGENT_TYPE_OPTIONS.map((opt) => {
                    const isSelected = promptForm.agentType === opt.value;
                    const existingActive = prompts.find((p) => p.agentType === opt.value && p.isActive);
                    return (
                      <div
                        key={opt.value}
                        onClick={() => {
                          const nextVer = getSuggestedVersion(opt.value);
                          setPromptForm((prev) => ({
                            ...prev,
                            agentType: opt.value,
                            version: nextVer,
                          }));
                        }}
                        className={`p-3 rounded-2xl border text-left cursor-pointer transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-50/70 shadow-xs ring-2 ring-emerald-500/20'
                            : 'border-slate-200 bg-slate-50/60 hover:bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1.5 mb-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-base">{opt.icon}</span>
                            <span className="font-black text-slate-900 text-xs">{opt.label}</span>
                          </div>
                          {isSelected ? (
                            <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            </span>
                          ) : (
                            <span className="w-4 h-4 rounded-full border border-slate-300 shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed mb-2">
                          {opt.desc}
                        </p>
                        <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[10px] text-slate-400 font-mono">
                          <span>{opt.value}</span>
                          {existingActive && (
                            <span className="text-emerald-700 font-bold">Active: {existingActive.version}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Version Input */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 text-xs">
                    2. Phiên bản Prompt (Version) <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-400">Gợi ý nhanh:</span>
                    {['v1.1', 'v1.2', 'v2.0'].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setPromptForm({ ...promptForm, version: v })}
                        className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-[11px] font-mono font-bold text-slate-600 hover:border-emerald-500 hover:text-emerald-700 transition-colors"
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={promptForm.version}
                    onChange={(e) => setPromptForm({ ...promptForm, version: e.target.value })}
                    placeholder="e.g. v1.1, v1.2, v2.0"
                    className="w-full p-2.5 border border-slate-200 rounded-xl bg-white font-mono text-slate-800 font-bold focus:ring-2 focus:ring-emerald-500/20"
                    required
                  />
                  <div className="text-[11px] text-slate-500 shrink-0">
                    Đang chọn: <span className="font-bold text-emerald-700 font-mono">{promptForm.agentType}</span>
                  </div>
                </div>
              </div>

              {/* Prompt Content Input */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-800 text-xs">
                    3. Nội dung câu lệnh System Prompt <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] text-slate-400">
                    {promptForm.promptContent.length} ký tự
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mb-1.5">
                  Chỉ thị này sẽ quy định vai trò, giọng điệu và giới hạn phản hồi của Agent khi chat với người dùng.
                </p>
                <textarea
                  rows={8}
                  value={promptForm.promptContent}
                  onChange={(e) => setPromptForm({ ...promptForm, promptContent: e.target.value })}
                  placeholder={`Ví dụ: Bạn là ${promptForm.agentType} của ứng dụng quản lý tủ lạnh thông minh Friggy. Nhiệm vụ của bạn là...`}
                  className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 font-mono text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 leading-relaxed shadow-inner"
                  required
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <span className="text-[11px] text-slate-400 italic">
                  * Prompt tạo mới sẽ ở trạng thái bản nháp. Bạn có thể kích hoạt sau khi kiểm tra.
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setOpenAddPromptModal(false)}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 font-bold text-slate-700 hover:bg-slate-200 transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={submittingPrompt}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-bold text-white shadow-md shadow-emerald-600/20 transition-colors flex items-center gap-1.5"
                  >
                    {submittingPrompt && <Loader2 className="w-4 h-4 animate-spin" />}
                    Lưu System Prompt
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: VIEW PROMPT DETAIL */}
      {selectedPrompt && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-[32px] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">
                    Chi Tiết System Prompt: <span className="font-mono text-emerald-700">{selectedPrompt.agentType}</span>
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 font-mono font-bold text-slate-700">
                      {selectedPrompt.version}
                    </span>
                    {selectedPrompt.isActive ? (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                        Đang Kích Hoạt
                      </span>
                    ) : (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold">
                        Bản Nháp / Lưu Trữ
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedPrompt(null);
                  setPromptDetail(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingDetail ? (
              <div className="py-16 text-center text-slate-400 font-semibold text-xs flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                <p>Đang tải nội dung prompt từ hệ thống...</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Nội dung câu lệnh (Prompt Content):
                  </label>
                  <button
                    type="button"
                    onClick={() => handleCopyPrompt(promptDetail?.promptContent || selectedPrompt?.promptContent || '')}
                    className="flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition-colors"
                  >
                    {copiedPrompt ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Đã sao chép!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Sao chép prompt</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="relative">
                  <pre className="p-4 rounded-2xl bg-slate-900 text-emerald-300 text-xs font-mono whitespace-pre-wrap max-h-96 overflow-y-auto border border-slate-800 leading-relaxed shadow-inner">
                    {promptDetail?.promptContent || selectedPrompt?.promptContent || 'Không có nội dung prompt.'}
                  </pre>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center pt-2 border-t border-slate-100">
              <div>
                {!selectedPrompt.isActive && (
                  <button
                    type="button"
                    onClick={() => {
                      const toEdit = promptDetail || selectedPrompt;
                      setSelectedPrompt(null);
                      setPromptDetail(null);
                      handleOpenEdit(toEdit);
                    }}
                    className="px-4 py-2 rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-100 font-bold text-xs flex items-center gap-1.5 transition-colors border border-amber-200"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Chỉnh Sửa Prompt Này
                  </button>
                )}
              </div>
              <button
                onClick={() => {
                  setSelectedPrompt(null);
                  setPromptDetail(null);
                }}
                className="px-5 py-2 rounded-xl bg-slate-100 font-bold text-xs text-slate-700 hover:bg-slate-200 transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDIT SYSTEM PROMPT */}
      {editingPrompt && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-white rounded-[32px] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">
                    Chỉnh Sửa Prompt: <span className="font-mono text-emerald-700">{editingPrompt.agentType}</span>
                  </h3>
                  <p className="text-xs text-slate-500">Phiên bản: {editingPrompt.version}</p>
                </div>
              </div>
              <button onClick={() => setEditingPrompt(null)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {editingPrompt.isActive ? (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs space-y-2">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Prompt đang ở trạng thái Kích Hoạt (Active)
                </p>
                <p className="leading-relaxed">
                  Để đảm bảo an toàn cho các tác vụ AI đang chạy, hệ thống không cho phép chỉnh sửa trực tiếp nội dung của một Prompt đang Active.
                </p>
                <p className="leading-relaxed font-semibold">
                  👉 Cách khuyến nghị: Hãy bấm nút &ldquo;+ Thêm System Prompt&rdquo; để tạo một phiên bản mới (ví dụ: <span className="font-mono">{editingPrompt.version}.1</span>), sau đó kích hoạt phiên bản đó.
                </p>
                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setPromptForm({
                        agentType: editingPrompt.agentType,
                        version: `${editingPrompt.version}.1`,
                        promptContent: editingPrompt.promptContent || '',
                      });
                      setEditingPrompt(null);
                      setOpenAddPromptModal(true);
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition-colors shadow-sm"
                  >
                    Tạo phiên bản mới từ prompt này
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSaveEditPrompt} className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Nội dung System Prompt <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={9}
                    value={editPromptContent}
                    onChange={(e) => setEditPromptContent(e.target.value)}
                    placeholder="Nhập nội dung mới cho prompt..."
                    className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 font-mono text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 leading-relaxed"
                    required
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEditingPrompt(null)}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 font-bold text-slate-700 hover:bg-slate-200 transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={savingEdit}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-bold text-white shadow-md shadow-emerald-600/20 transition-colors flex items-center gap-1.5"
                  >
                    {savingEdit && <Loader2 className="w-4 h-4 animate-spin" />}
                    Lưu Thay Đổi
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AiManagement;
