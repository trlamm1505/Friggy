import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Settings,
  Bot,
  Shield,
  Save,
  CheckCircle2,
  Globe,
} from 'lucide-react';

export const AdminSettings = () => {
  const [activeSubTab, setActiveSubTab] = useState('general');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const [generalConfig, setGeneralConfig] = useState({
    supportEmail: 'support@friggy.ai',
    supportHotline: '1900 8888',
    maxFreeItems: '30',
    maxAiCallsDaily: '5',
  });

  const [aiConfig, setAiConfig] = useState({
    aiModel: 'Gemini 3.6 Flash (Recommended)',
    apiKey: 'AIzaSyD-mock-friggy-gemini-key-998822',
    maxTokens: '1024',
    temperature: '0.7',
  });

  const [tokenConfig, setTokenConfig] = useState({
    accessTokenLifetime: '60',
    refreshTokenLifetime: '7',
  });

  const handleSave = (e) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="p-6 sm:p-8 rounded-[32px] bg-white border border-emerald-100 shadow-sm flex items-center justify-between">
        <div>
          <h3 className="text-xl sm:text-2xl font-black text-emerald-950 tracking-tight flex items-center gap-2">
            <span>Thiết Lập & Cấu Hình Hệ Thống</span>
            <Settings className="w-5 h-5 text-emerald-600" />
          </h3>
          <p className="text-xs sm:text-sm text-emerald-900/65 font-medium mt-1">
            Tùy chỉnh thông tin hỗ trợ, giới hạn lượt dùng, chìa khóa API AI và bảo mật.
          </p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-emerald-200/80 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('general')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'general'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-white text-emerald-900 hover:bg-emerald-50'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>Cấu Hình Chung</span>
        </button>

        <button
          onClick={() => setActiveSubTab('ai')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'ai'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-white text-emerald-900 hover:bg-emerald-50'
          }`}
        >
          <Bot className="w-4 h-4" />
          <span>AI Friggy Chef</span>
        </button>

        <button
          onClick={() => setActiveSubTab('security')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'security'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-white text-emerald-900 hover:bg-emerald-50'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Bảo Mật Admin</span>
        </button>
      </div>

      {/* Save Success Alert */}
      {savedSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Đã lưu thành công các thiết lập hệ thống!</span>
        </motion.div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="p-6 sm:p-8 rounded-[32px] bg-white border border-emerald-100 shadow-sm space-y-6">
        {/* General Config Tab */}
        {activeSubTab === 'general' && (
          <div className="space-y-4">
            <h4 className="text-sm font-black text-emerald-950 border-b border-emerald-100 pb-3">Thông Tin Cấu Hình</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-emerald-950">Email Chăm Sóc Khách Hàng</label>
                <input
                  type="email"
                  value={generalConfig.supportEmail}
                  onChange={(e) => setGeneralConfig({ ...generalConfig, supportEmail: e.target.value })}
                  className="w-full px-4 py-3 bg-emerald-50/50 hover:bg-emerald-50 focus:bg-white border border-emerald-200 rounded-2xl text-xs font-semibold text-emerald-950 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-bold text-emerald-950">Hotline Hỗ Trợ</label>
                <input
                  type="text"
                  value={generalConfig.supportHotline}
                  onChange={(e) => setGeneralConfig({ ...generalConfig, supportHotline: e.target.value })}
                  className="w-full px-4 py-3 bg-emerald-50/50 hover:bg-emerald-50 focus:bg-white border border-emerald-200 rounded-2xl text-xs font-semibold text-emerald-950 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-bold text-emerald-950">Giới Hạn Đồ Tồn Tủ Lạnh Free</label>
                <input
                  type="number"
                  value={generalConfig.maxFreeItems}
                  onChange={(e) => setGeneralConfig({ ...generalConfig, maxFreeItems: e.target.value })}
                  className="w-full px-4 py-3 bg-emerald-50/50 hover:bg-emerald-50 focus:bg-white border border-emerald-200 rounded-2xl text-xs font-semibold text-emerald-950 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-bold text-emerald-950">Giới Hạn Số Lần Gọi AI Ra Món Ăn (Lần/ngày)</label>
                <input
                  type="number"
                  value={generalConfig.maxAiCallsDaily}
                  onChange={(e) => setGeneralConfig({ ...generalConfig, maxAiCallsDaily: e.target.value })}
                  className="w-full px-4 py-3 bg-emerald-50/50 hover:bg-emerald-50 focus:bg-white border border-emerald-200 rounded-2xl text-xs font-semibold text-emerald-950 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
                />
              </div>
            </div>
          </div>
        )}

        {/* AI Config Tab */}
        {activeSubTab === 'ai' && (
          <div className="space-y-4">
            <h4 className="text-sm font-black text-emerald-950 border-b border-emerald-100 pb-3">Tích Hợp Trợ Lý AI Friggy Chef</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-emerald-950">Mô hình Model AI Default</label>
                <select
                  value={aiConfig.aiModel}
                  onChange={(e) => setAiConfig({ ...aiConfig, aiModel: e.target.value })}
                  className="w-full px-4 py-3 bg-emerald-50/50 hover:bg-emerald-50 focus:bg-white border border-emerald-200 rounded-2xl text-xs font-semibold text-emerald-950 cursor-pointer focus:outline-none focus:border-emerald-500 transition-all"
                >
                  <option value="Gemini 3.6 Flash (Recommended)">Gemini 3.6 Flash (Khuyên dùng)</option>
                  <option value="OpenAI GPT-4o">OpenAI GPT-4o</option>
                  <option value="Claude 3.5 Sonnet">Claude 3.5 Sonnet</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-bold text-emerald-950">API Key Server Secret</label>
                <input
                  type="password"
                  value={aiConfig.apiKey}
                  onChange={(e) => setAiConfig({ ...aiConfig, apiKey: e.target.value })}
                  className="w-full px-4 py-3 bg-emerald-50/50 hover:bg-emerald-50 focus:bg-white border border-emerald-200 rounded-2xl text-xs font-semibold text-emerald-950 focus:outline-none focus:border-emerald-500 transition-all"
                />
              </div>
            </div>
          </div>
        )}

        {/* Security & Token Lifetime Tab */}
        {activeSubTab === 'security' && (
          <div className="space-y-4">
            <h4 className="text-sm font-black text-emerald-950 border-b border-emerald-100 pb-3">Cấu Hình Thời Gian Token Bảo Mật</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-emerald-950">Thời Gian Hết Hạn Access Token (Phút)</label>
                <input
                  type="number"
                  value={tokenConfig.accessTokenLifetime}
                  onChange={(e) => setTokenConfig({ ...tokenConfig, accessTokenLifetime: e.target.value })}
                  placeholder="VD: 60 (phút)"
                  className="w-full px-4 py-3 bg-emerald-50/50 hover:bg-emerald-50 focus:bg-white border border-emerald-200 rounded-2xl text-xs font-semibold text-emerald-950 focus:outline-none focus:border-emerald-500 transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-bold text-emerald-950">Thời Gian Hết Hạn Refresh Token (Ngày)</label>
                <input
                  type="number"
                  value={tokenConfig.refreshTokenLifetime}
                  onChange={(e) => setTokenConfig({ ...tokenConfig, refreshTokenLifetime: e.target.value })}
                  placeholder="VD: 7 (ngày)"
                  className="w-full px-4 py-3 bg-emerald-50/50 hover:bg-emerald-50 focus:bg-white border border-emerald-200 rounded-2xl text-xs font-semibold text-emerald-950 focus:outline-none focus:border-emerald-500 transition-all"
                />
              </div>
            </div>
          </div>
        )}

        {/* Submit Footer */}
        <div className="pt-4 border-t border-emerald-100 flex justify-end">
          <button
            type="submit"
            className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-emerald-600/20 flex items-center gap-2 cursor-pointer transition-all"
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
