import React, { useEffect, useState } from 'react';
import {
  Clock,
  Play,
  Edit2,
  CheckCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  X,
  Zap,
  Info,
  Sparkles,
  Check,
} from 'lucide-react';
import {
  getCronJobsApi,
  updateCronJobApi,
  triggerCronJobApi,
} from '../../../services/adminService';
import { showToast } from '../../../components/common/Toast';

/**
 * Chuyển đổi cú pháp Cron Expression sang ngôn ngữ tiếng Việt dễ hiểu
 */
export const cronToHumanReadable = (cronStr) => {
  if (!cronStr) return 'Chưa thiết lập';
  const parts = cronStr.trim().split(/\s+/);
  if (parts.length < 5) return cronStr;

  const [min, hour, dayOfMonth, month, dayOfWeek] = parts;

  // Trường hợp lặp theo phút: */15 * * * *
  if (min.startsWith('*/')) {
    const interval = min.replace('*/', '');
    return `Chạy định kỳ mỗi ${interval} phút một lần`;
  }
  // Trường hợp lặp theo giờ: 0 */2 * * *
  if (hour.startsWith('*/')) {
    const interval = hour.replace('*/', '');
    return `Chạy định kỳ mỗi ${interval} giờ một lần`;
  }

  const formattedMin = min.padStart(2, '0');
  const formattedHour = hour.padStart(2, '0');

  // Hàng ngày: 0 8 * * *
  if (dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    return `Chạy vào ${formattedHour}:${formattedMin} sáng/chiều mỗi ngày`;
  }

  const daysMap = {
    '0': 'Chủ Nhật',
    '1': 'Thứ Hai',
    '2': 'Thứ Ba',
    '3': 'Thứ Tư',
    '4': 'Thứ Năm',
    '5': 'Thứ Sáu',
    '6': 'Thứ Bảy',
    '7': 'Chủ Nhật',
  };

  // Hàng tuần: 0 8 * * 1
  if (dayOfWeek !== '*' && dayOfMonth === '*' && month === '*') {
    const dayName = daysMap[dayOfWeek] || `Thứ ${dayOfWeek}`;
    return `Chạy vào ${formattedHour}:${formattedMin} ${dayName} hàng tuần`;
  }

  // Hàng tháng: 0 8 1 * *
  if (dayOfMonth !== '*' && month === '*') {
    return `Chạy vào ${formattedHour}:${formattedMin} ngày ${dayOfMonth} hàng tháng`;
  }

  return `Lịch trình: ${cronStr}`;
};

export const CronManagement = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingName, setActionLoadingName] = useState(null);

  // Edit Modal State
  const [editingJob, setEditingJob] = useState(null);
  const [editForm, setEditForm] = useState({
    cronExpression: '0 8 * * *',
    isActive: true,
  });

  // Timepicker helper state in Modal
  const [selectedHour, setSelectedHour] = useState('08');
  const [selectedMinute, setSelectedMinute] = useState('00');
  const [cronMode, setCronMode] = useState('daily'); // 'daily' | 'weekly' | 'custom'

  const fetchCronJobs = async () => {
    setLoading(true);
    try {
      const res = await getCronJobsApi();
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setJobs(list);
    } catch (err) {
      console.error('Lỗi khi tải danh sách Cron Jobs:', err);
      showToast.error(err.message || 'Không thể tải danh sách Cron Jobs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCronJobs();
  }, []);

  // Handle Trigger Cron Job Manually
  const handleTrigger = async (name) => {
    setActionLoadingName(`trig-${name}`);
    try {
      const res = await triggerCronJobApi(name);
      const msg = res?.message || `Đã kích hoạt chạy cron job ${name} thành công!`;
      showToast.success(msg);
      fetchCronJobs();
    } catch (err) {
      showToast.error(err.message || 'Kích hoạt cron job thất bại');
    } finally {
      setActionLoadingName(null);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (job) => {
    setEditingJob(job);
    const cronStr = job.cronExpression || job.schedule || '0 8 * * *';
    setEditForm({
      cronExpression: cronStr,
      isActive: job.isActive ?? true,
    });

    // Parse hour & minute if standard format "min hour * * *"
    const parts = cronStr.trim().split(/\s+/);
    if (parts.length >= 2 && !parts[0].includes('*') && !parts[1].includes('*')) {
      setSelectedMinute(parts[0].padStart(2, '0'));
      setSelectedHour(parts[1].padStart(2, '0'));
      setCronMode('daily');
    } else {
      setCronMode('custom');
    }
  };

  // Preset quick selections
  const PRESETS = [
    { label: '08:00 Sáng hàng ngày', value: '0 8 * * *' },
    { label: '12:00 Trưa hàng ngày', value: '0 12 * * *' },
    { label: '18:00 Chiều hàng ngày', value: '0 18 * * *' },
    { label: '20:00 Tối hàng ngày', value: '0 20 * * *' },
    { label: 'Mỗi 15 phút', value: '*/15 * * * *' },
    { label: 'Mỗi 30 phút', value: '*/30 * * * *' },
    { label: 'Mỗi 1 giờ', value: '0 * * * *' },
    { label: '08:00 Thứ 2 hàng tuần', value: '0 8 * * 1' },
  ];

  // Apply Quick Preset
  const handleApplyPreset = (presetValue) => {
    setEditForm({ ...editForm, cronExpression: presetValue });
    const parts = presetValue.split(/\s+/);
    if (parts.length >= 2 && !parts[0].includes('*') && !parts[1].includes('*')) {
      setSelectedMinute(parts[0].padStart(2, '0'));
      setSelectedHour(parts[1].padStart(2, '0'));
      setCronMode('daily');
    } else {
      setCronMode('custom');
    }
  };

  // Update Cron string when Hour/Minute changes in daily mode
  const handleTimePickerChange = (hour, min) => {
    setSelectedHour(hour);
    setSelectedMinute(min);
    const newCron = `${parseInt(min, 10)} ${parseInt(hour, 10)} * * *`;
    setEditForm({ ...editForm, cronExpression: newCron });
  };

  // Save Edit Cron Job
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingJob) return;
    try {
      await updateCronJobApi(editingJob.name, editForm);
      showToast.success(`Đã cập nhật cron job ${editingJob.name}`);
      setEditingJob(null);
      fetchCronJobs();
    } catch (err) {
      showToast.error(err.message || 'Cập nhật cron job thất bại');
    }
  };

  return (
    <div className="space-y-6 pb-12 animate__animated animate__fadeIn animate__faster">
      {/* Top Header Card */}
      <div className="p-6 rounded-[32px] bg-white border border-slate-100 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Clock className="w-6 h-6 text-emerald-600" />
            Quản Lý Tiến Trình Tự Động (Cron Jobs)
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Xem lịch hẹn thời gian thực tế, điều chỉnh giờ chạy dễ dàng và trigger chạy thử ngầm
          </p>
        </div>

        <button
          onClick={fetchCronJobs}
          className="p-3 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-2xl border border-slate-200 transition-colors cursor-pointer self-start md:self-auto"
          title="Làm mới danh sách"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Main Table Card */}
      <div className="p-6 rounded-[32px] bg-white border border-slate-100 shadow-md space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <h3 className="text-base font-black text-slate-900">Danh Sách Cron Jobs Hệ Thống ({jobs.length})</h3>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400 font-semibold text-sm flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            <p>Đang tải danh sách Cron Jobs...</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="py-12 text-center text-slate-400 font-semibold text-sm">Chưa có Cron Job nào được đăng ký.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[750px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4 rounded-l-xl">Tên Tiến Trình</th>
                  <th className="py-3.5 px-4">Thời Gian Chạy Tự Động</th>
                  <th className="py-3.5 px-4">Lần Chạy Gần Nhất</th>
                  <th className="py-3.5 px-4">Trạng Thái</th>
                  <th className="py-3.5 px-4 rounded-r-xl text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold">
                {jobs.map((job) => {
                  const isActive = job.isActive ?? true;
                  const isTriggering = actionLoadingName === `trig-${job.name}`;
                  const cronStr = job.cronExpression || job.schedule || '* * * * *';
                  const humanTime = cronToHumanReadable(cronStr);

                  const lastRunStr = job.lastRunAt
                    ? new Date(job.lastRunAt).toLocaleString('vi-VN')
                    : 'Chưa từng chạy';

                  return (
                    <tr key={job.name} className="hover:bg-slate-50/80 transition-colors">
                      {/* Name & Description */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold shrink-0">
                            <Zap className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-mono font-black text-slate-900">{job.name}</p>
                            {job.description && (
                              <p className="text-[11px] text-slate-500 font-normal">{job.description}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Readable Time Format Badge */}
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
                            <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>{humanTime}</span>
                          </div>
                          <div className="text-[10px] font-mono text-slate-400 pl-1">
                            Cú pháp Cron: <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-600">{cronStr}</code>
                          </div>
                        </div>
                      </td>

                      {/* Last Run Time */}
                      <td className="py-4 px-4 text-slate-500 font-medium">{lastRunStr}</td>

                      {/* Active Status */}
                      <td className="py-4 px-4">
                        {isActive ? (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-black border border-emerald-200 inline-flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Đang bật
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 text-[11px] font-black border border-rose-200 inline-flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5 text-rose-500" /> Tạm dừng
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEdit(job)}
                            className="p-2 rounded-xl text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                            title="Sửa Lịch Trình / Bật Tắt"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          <button
                            disabled={isTriggering}
                            onClick={() => handleTrigger(job.name)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                            title="Chạy thủ công ngay bây giờ"
                          >
                            {isTriggering ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Play className="w-3.5 h-3.5 fill-current" />
                            )}
                            <span>Trigger Ngay</span>
                          </button>
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

      {/* EASY EDIT CRON JOB MODAL */}
      {editingJob && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-[36px] p-6 sm:p-7 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-black text-slate-900 text-base">Cài Đặt Lịch Trình Tự Động</h3>
                <p className="text-xs font-mono text-emerald-700 font-bold">{editingJob.name}</p>
              </div>
              <button
                onClick={() => setEditingJob(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              {/* Live Preview Box */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-600 to-emerald-600 text-white space-y-1 shadow-md">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-100 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> Giải thích thời gian chạy:
                </span>
                <p className="text-sm font-black drop-shadow-xs">
                  {cronToHumanReadable(editForm.cronExpression)}
                </p>
              </div>

              {/* Quick Select Presets */}
              <div className="space-y-2">
                <label className="font-extrabold text-slate-700 block">⚡ Chọn Nhanh Lịch Trình:</label>
                <div className="grid grid-cols-2 gap-2">
                  {PRESETS.map((p) => {
                    const isSelected = editForm.cronExpression === p.value;
                    return (
                      <button
                        type="button"
                        key={p.value}
                        onClick={() => handleApplyPreset(p.value)}
                        className={`p-2.5 rounded-xl border text-left font-bold transition-all flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-2xs'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <span className="truncate">{p.label}</span>
                        {isSelected && <Check className="w-4 h-4 text-emerald-600 shrink-0 ml-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Easy Hour / Minute Picker */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <label className="font-extrabold text-slate-800 block">🕒 Chọn Giờ Chạy Hàng Ngày (Chỉ cần chọn giờ):</label>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <span className="text-[10px] text-slate-400 font-bold block mb-1">Giờ (00 - 23)</span>
                    <select
                      value={selectedHour}
                      onChange={(e) => handleTimePickerChange(e.target.value, selectedMinute)}
                      className="w-full p-2.5 border rounded-xl bg-white font-bold text-slate-900"
                    >
                      {Array.from({ length: 24 }).map((_, i) => {
                        const h = i.toString().padStart(2, '0');
                        return (
                          <option key={h} value={h}>
                            {h} : 00 ({h >= 12 ? `${h}h chiều/tối` : `${h}h sáng`})
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div className="flex-1">
                    <span className="text-[10px] text-slate-400 font-bold block mb-1">Phút (00 - 59)</span>
                    <select
                      value={selectedMinute}
                      onChange={(e) => handleTimePickerChange(selectedHour, e.target.value)}
                      className="w-full p-2.5 border rounded-xl bg-white font-bold text-slate-900"
                    >
                      {['00', '15', '30', '45'].map((m) => (
                        <option key={m} value={m}>
                          {m} phút
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Advanced Cron Input */}
              <div className="space-y-1">
                <label className="font-extrabold text-slate-700 block">Cú pháp Cron (Nâng cao):</label>
                <input
                  type="text"
                  value={editForm.cronExpression}
                  onChange={(e) => setEditForm({ ...editForm, cronExpression: e.target.value })}
                  className="w-full p-2.5 border rounded-xl bg-slate-50 font-mono font-bold text-emerald-800"
                  required
                />
              </div>

              {/* Active Toggle Switch */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border">
                <span className="font-black text-slate-800">Trạng Thái Bật Tiến Trình Tự Động</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.isActive}
                    onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setEditingJob(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 font-bold text-slate-700 hover:bg-slate-200 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md transition-all"
                >
                  Lưu Lịch Trình
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CronManagement;
