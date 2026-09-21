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
  Loader2,
  RefreshCw,
  ShieldCheck,
  Code,
  Sparkles,
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
} from '../../../services/adminService';
import { showToast } from '../../../components/common/Toast';

export const AiManagement = () => {
  const [activeTab, setActiveTab] = useState('providers'); // 'providers' | 'prompts'

  // Providers state
  const [providers, setProviders] = useState([]);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [openAddProviderModal, setOpenAddProviderModal] = useState(false);
  const [providerForm, setProviderForm] = useState({
    providerName: 'openai',
    modelName: 'gpt-4o',
    apiKey: '',
    usageNote: '',
  });

  // Prompts state
  const [prompts, setPrompts] = useState([]);
  const [loadingPrompts, setLoadingPrompts] = useState(true);
  const [selectedPrompt, setSelectedPrompt] = useState(null);
  const [promptDetail, setPromptDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [openAddPromptModal, setOpenAddPromptModal] = useState(false);
  const [promptForm, setPromptForm] = useState({
    agentType: 'fridge_assistant',
    version: '1.0.0',
    name: 'Gợi ý món ăn thông minh',
    description: '',
    content: '',
  });

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

  // Handle Create Provider
  const handleCreateProvider = async (e) => {
    e.preventDefault();
    if (!providerForm.apiKey.trim()) {
      showToast.error('Vui lòng nhập API Key');
      return;
    }
    try {
      await createAiProviderApi(providerForm);
      showToast.success('Đã thêm AI Provider mới!');
      setOpenAddProviderModal(false);
      setProviderForm({ providerName: 'openai', modelName: 'gpt-4o', apiKey: '', usageNote: '' });
      fetchProviders();
    } catch (err) {
      showToast.error(err.message || 'Tạo provider thất bại');
    }
  };

  // Handle View Prompt Detail
  const handleViewPrompt = async (prompt) => {
    setSelectedPrompt(prompt);
    setLoadingDetail(true);
    try {
      const res = await getAiPromptDetailApi(prompt.id);
      setPromptDetail(res?.data || res);
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

  // Handle Create Prompt
  const handleCreatePrompt = async (e) => {
    e.preventDefault();
    if (!promptForm.content.trim()) {
      showToast.error('Vui lòng nhập nội dung System Prompt');
      return;
    }
    try {
      await createAiPromptApi(promptForm);
      showToast.success('Đã thêm System Prompt mới!');
      setOpenAddPromptModal(false);
      setPromptForm({
        agentType: 'fridge_assistant',
        version: '1.0.0',
        name: 'Gợi ý món ăn thông minh',
        description: '',
        content: '',
      });
      fetchPrompts();
    } catch (err) {
      showToast.error(err.message || 'Tạo prompt thất bại');
    }
  };

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
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4 rounded-l-xl">Agent Type</th>
                    <th className="py-3 px-4">Tên Prompt / Version</th>
                    <th className="py-3 px-4">Mô Tả</th>
                    <th className="py-3 px-4">Trạng Thái</th>
                    <th className="py-3 px-4 rounded-r-xl text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold">
                  {prompts.map((pmt) => {
                    const isActive = pmt.isActive;
                    return (
                      <tr key={pmt.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-emerald-700">{pmt.agentType}</td>
                        <td className="py-3.5 px-4">
                          <p className="font-black text-slate-900">{pmt.name}</p>
                          <span className="text-[10px] text-slate-400 font-mono">v{pmt.version}</span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate">{pmt.description || 'N/A'}</td>
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
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleViewPrompt(pmt)}
                              className="p-2 rounded-xl text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                              title="Xem nội dung Prompt"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {!isActive && (
                              <button
                                disabled={actionLoadingId === `pmt-act-${pmt.id}`}
                                onClick={() => handleActivatePrompt(pmt.id)}
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors cursor-pointer flex items-center gap-1"
                              >
                                {actionLoadingId === `pmt-act-${pmt.id}` ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Sparkles className="w-3.5 h-3.5" />
                                )}
                                <span>Kích Hoạt</span>
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

      {/* MODAL: ADD AI PROVIDER */}
      {openAddProviderModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-[32px] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-black text-slate-900 text-base">Thêm AI Provider Mới</h3>
              <button onClick={() => setOpenAddProviderModal(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateProvider} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nhà cung cấp (Provider)</label>
                <select
                  value={providerForm.providerName}
                  onChange={(e) => setProviderForm({ ...providerForm, providerName: e.target.value })}
                  className="w-full p-2.5 border rounded-xl bg-slate-50 font-bold"
                >
                  <option value="openai">OpenAI</option>
                  <option value="gemini">Google Gemini</option>
                  <option value="claude">Anthropic Claude</option>
                  <option value="deepseek">DeepSeek</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Tên Model</label>
                <input
                  type="text"
                  value={providerForm.modelName}
                  onChange={(e) => setProviderForm({ ...providerForm, modelName: e.target.value })}
                  placeholder="e.g. gpt-4o, gemini-1.5-pro"
                  className="w-full p-2.5 border rounded-xl bg-slate-50 font-semibold"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">API Key</label>
                <input
                  type="password"
                  value={providerForm.apiKey}
                  onChange={(e) => setProviderForm({ ...providerForm, apiKey: e.target.value })}
                  placeholder="sk-..."
                  className="w-full p-2.5 border rounded-xl bg-slate-50 font-mono"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Ghi chú sử dụng (Optional)</label>
                <input
                  type="text"
                  value={providerForm.usageNote}
                  onChange={(e) => setProviderForm({ ...providerForm, usageNote: e.target.value })}
                  placeholder="Ghi chú thêm về provider này"
                  className="w-full p-2.5 border rounded-xl bg-slate-50"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setOpenAddProviderModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 font-bold text-slate-700"
                >
                  Hủy
                </button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-emerald-600 font-bold text-white shadow-md">
                  Lưu Provider
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD SYSTEM PROMPT */}
      {openAddPromptModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-[32px] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-black text-slate-900 text-base">Thêm System Prompt Mới</h3>
              <button onClick={() => setOpenAddPromptModal(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreatePrompt} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Agent Type</label>
                  <input
                    type="text"
                    value={promptForm.agentType}
                    onChange={(e) => setPromptForm({ ...promptForm, agentType: e.target.value })}
                    placeholder="e.g. fridge_assistant"
                    className="w-full p-2.5 border rounded-xl bg-slate-50 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Version</label>
                  <input
                    type="text"
                    value={promptForm.version}
                    onChange={(e) => setPromptForm({ ...promptForm, version: e.target.value })}
                    placeholder="e.g. 1.0.0"
                    className="w-full p-2.5 border rounded-xl bg-slate-50 font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Tên Prompt</label>
                <input
                  type="text"
                  value={promptForm.name}
                  onChange={(e) => setPromptForm({ ...promptForm, name: e.target.value })}
                  placeholder="Tên gợi nhớ cho prompt"
                  className="w-full p-2.5 border rounded-xl bg-slate-50 font-bold"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Mô tả ngắn</label>
                <input
                  type="text"
                  value={promptForm.description}
                  onChange={(e) => setPromptForm({ ...promptForm, description: e.target.value })}
                  placeholder="Mô tả công dụng của prompt"
                  className="w-full p-2.5 border rounded-xl bg-slate-50"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Nội dung System Prompt</label>
                <textarea
                  rows={5}
                  value={promptForm.content}
                  onChange={(e) => setPromptForm({ ...promptForm, content: e.target.value })}
                  placeholder="Nhập nội dung system prompt..."
                  className="w-full p-2.5 border rounded-xl bg-slate-50 font-mono text-xs"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setOpenAddPromptModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 font-bold text-slate-700"
                >
                  Hủy
                </button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-emerald-600 font-bold text-white shadow-md">
                  Lưu System Prompt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: VIEW PROMPT DETAIL */}
      {selectedPrompt && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-white rounded-[32px] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-black text-slate-900 text-base">{selectedPrompt.name}</h3>
                <p className="text-xs text-emerald-700 font-mono">
                  Agent: {selectedPrompt.agentType} • v{selectedPrompt.version}
                </p>
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
              <div className="py-12 text-center text-slate-400 font-semibold text-sm flex items-center justify-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                <p>Đang tải nội dung chi tiết prompt...</p>
              </div>
            ) : (
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Nội dung đầy đủ của Prompt:
                </label>
                <pre className="p-4 rounded-2xl bg-slate-900 text-emerald-400 text-xs font-mono whitespace-pre-wrap max-h-80 overflow-y-auto border border-slate-800">
                  {promptDetail?.content || selectedPrompt?.content || 'Chưa có nội dung.'}
                </pre>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => {
                  setSelectedPrompt(null);
                  setPromptDetail(null);
                }}
                className="px-5 py-2 rounded-xl bg-slate-100 font-bold text-xs text-slate-700 hover:bg-slate-200"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AiManagement;
