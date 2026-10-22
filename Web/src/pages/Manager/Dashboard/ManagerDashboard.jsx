import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  DollarSign,
  TrendingUp,
  PackageCheck,
  Calendar,
  ChevronRight,
  Utensils,
  ChefHat,
  CreditCard,
  Building2,
  Sparkles,
} from 'lucide-react';
import goodMorningImg from '../../../assets/images/goodmorning-Photoroom.png';
import goodAfternoonImg from '../../../assets/images/goodafternoon-Photoroom.png';
import goodEveningImg from '../../../assets/images/goodevening-Photoroom.png';
import {
  getAdminStatsOverviewApi,
  getAdminStatsSubscriptionsApi,
} from '../../../services/adminService';
import AnimatedCounter from '../../../components/common/AnimatedCounter';

export const ManagerDashboard = (props) => {
  const navigate = useNavigate();

  const [overviewData, setOverviewData] = useState(null);
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [loading, setLoading] = useState(true);

  const onNavigateTab = props.onNavigateTab || ((tab) => navigate(`/manager/${tab}`));

  const resolveAvatarUrl = (rawUrl) => {
    if (!rawUrl) return null;
    let formatted = rawUrl.trim();
    if (formatted.includes('api.friggy.io.vn')) {
      formatted = formatted.replace('api.friggy.io.vn', 'file.friggy.io.vn');
    }
    if (formatted.startsWith('http://') || formatted.startsWith('https://') || formatted.startsWith('data:')) {
      return formatted;
    }
    if (formatted.startsWith('file.friggy.io.vn')) {
      return `https://${formatted}`;
    }
    const apiBase = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'https://api.friggy.io.vn/api/v1';
    let fileBase = 'https://file.friggy.io.vn';
    if (!apiBase.includes('friggy.io.vn')) {
      fileBase = apiBase.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');
    }
    return `${fileBase}${formatted.startsWith('/') ? '' : '/'}${formatted}`;
  };

  const getInitialManagerInfo = () => {
    try {
      const cached = localStorage.getItem('friggy_user') || localStorage.getItem('user');
      if (cached) {
        const me = JSON.parse(cached);
        const name =
          me.name ||
          me.profile?.name ||
          (me.googleEmail ? me.googleEmail.split('@')[0] : null) ||
          (me.email ? me.email.split('@')[0] : null) ||
          '';
        const avatarUrl = me.profile?.avatarUrl || me.avatarUrl || me.profile?.avatarPath || me.avatarPath || null;
        return { name, avatarUrl };
      }
    } catch (e) {}
    return { name: '', avatarUrl: null };
  };

  const initialInfo = getInitialManagerInfo();
  const [managerName, setManagerName] = useState(initialInfo.name);

  useEffect(() => {
    const handleProfileUpdate = () => {
      const updated = getInitialManagerInfo();
      if (updated.name) setManagerName(updated.name);
    };

    window.addEventListener('user_profile_updated', handleProfileUpdate);
    return () => {
      window.removeEventListener('user_profile_updated', handleProfileUpdate);
    };
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const [overviewRes, subRes] = await Promise.allSettled([
          getAdminStatsOverviewApi(),
          getAdminStatsSubscriptionsApi(),
        ]);

        if (overviewRes.status === 'fulfilled' && overviewRes.value?.data) {
          setOverviewData(overviewRes.value.data);
        }
        if (subRes.status === 'fulfilled' && subRes.value?.data) {
          setSubscriptionData(subRes.value.data);
        }
      } catch (err) {
        console.error('Error fetching manager stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const getGreetingData = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      return {
        text: 'Chào Buổi Sáng',
        sub: 'Chúc bạn một ngày làm việc hiệu quả và tràn đầy năng lượng!',
        img: goodMorningImg,
        gradient: 'from-amber-500/10 via-emerald-500/10 to-teal-500/10',
        badge: 'Buổi Sáng Tươi Mới ☀️',
      };
    } else if (hour >= 12 && hour < 18) {
      return {
        text: 'Chào Buổi Chiều',
        sub: 'Cùng kiểm tra tiến độ vận hành và tình hình kho thực phẩm hôm nay.',
        img: goodAfternoonImg,
        gradient: 'from-emerald-500/10 via-teal-500/10 to-cyan-500/10',
        badge: 'Buổi Chiều Năng Động 🌤️',
      };
    } else {
      return {
        text: 'Chào Buổi Tối',
        sub: 'Tổng kết hoạt động hệ thống và chuẩn bị cho ngày làm việc tiếp theo.',
        img: goodEveningImg,
        gradient: 'from-teal-500/10 via-emerald-500/10 to-slate-800/10',
        badge: 'Buổi Tối Bình Yên 🌙',
      };
    }
  };

  const greeting = getGreetingData();

  // Chỉ lấy và hiển thị số liệu thực từ API, không dùng mock data
  const totalUsersCount = overviewData?.users?.total ?? 0;
  const activeUsersCount = overviewData?.users?.active ?? 0;
  const totalRevenueVnd = overviewData?.revenue?.totalVnd ?? 0;
  const totalSubsCount = overviewData?.subscriptions?.active ?? 0;

  return (
    <div className="space-y-6 sm:space-y-8 animate__animated animate__fadeIn">
      {/* ── Top Hero Greeting Banner ─────────────────────────────────── */}
      <div className={`relative overflow-hidden rounded-[32px] bg-gradient-to-r ${greeting.gradient} bg-white border border-emerald-100 p-6 sm:p-8 lg:p-10 shadow-sm`}>
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2.5 text-center md:text-left max-w-xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-100 text-teal-800 text-xs font-bold border border-teal-200">
              <Sparkles className="w-3.5 h-3.5" />
              {greeting.badge}
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">
              {greeting.text}, {managerName || 'Quản Lý'}! 👋
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
              {greeting.sub} Dưới đây là các chỉ số vận hành và tương tác người dùng trong hệ sinh thái Friggy.
            </p>
          </div>

          <div className="relative flex-shrink-0">
            <div className="w-32 sm:w-40 h-32 sm:h-40 relative flex items-center justify-center">
              <img
                src={greeting.img}
                alt="Friggy Greeting Mascot"
                className="w-full h-full object-contain filter drop-shadow-lg animate__animated animate__pulse animate__infinite animate__slower"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Key Operational Metrics ─────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Metric 1: Total Users */}
        <div className="bg-white rounded-3xl p-6 border border-emerald-100 shadow-2xs hover:shadow-md transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Người Dùng</span>
            <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              <AnimatedCounter target={totalUsersCount} />
            </h3>
            <p className="text-xs text-teal-600 font-semibold mt-1 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{activeUsersCount} đang hoạt động</span>
            </p>
          </div>
        </div>

        {/* Metric 2: Revenue */}
        <div className="bg-white rounded-3xl p-6 border border-emerald-100 shadow-2xs hover:shadow-md transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Doanh Thu PayOS</span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              <AnimatedCounter target={totalRevenueVnd} formatter={(v) => `${Number(v).toLocaleString('vi-VN')} đ`} />
            </h3>
            <p className="text-xs text-emerald-600 font-semibold mt-1 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Cập nhật thời gian thực</span>
            </p>
          </div>
        </div>

        {/* Metric 3: Active Packages */}
        <div className="bg-white rounded-3xl p-6 border border-emerald-100 shadow-2xs hover:shadow-md transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Thuê Bao Active</span>
            <div className="w-10 h-10 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <PackageCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              <AnimatedCounter target={totalSubsCount} />
            </h3>
            <p className="text-xs text-cyan-600 font-semibold mt-1">
              Gói Pro & Gia Đình
            </p>
          </div>
        </div>

        {/* Metric 4: Operational Status */}
        <div className="bg-white rounded-3xl p-6 border border-emerald-100 shadow-2xs hover:shadow-md transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Trạng Thái Hệ Thống</span>
            <div className="w-10 h-10 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-lg sm:text-xl font-black text-emerald-700">Hoạt Động Tốt</span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Sẵn sàng phục vụ người dùng
            </p>
          </div>
        </div>
      </div>

      {/* ── Quick Action Tiles for Manager ──────────────────────────── */}
      <div>
        <h3 className="text-base sm:text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
          <span>Lối Tắt Tác Vụ Quản Lý</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Tile 1: Ingredients */}
          <button
            onClick={() => onNavigateTab('ingredients')}
            className="p-5 bg-white rounded-2xl border border-emerald-100 hover:border-teal-400 hover:shadow-md transition-all text-left group cursor-pointer"
          >
            <div className="w-11 h-11 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Utensils className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-extrabold text-slate-900 group-hover:text-teal-700 transition-colors">
              Kho Nguyên Liệu
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              Kiểm tra hạn sử dụng 3 ngăn, calo và phân loại
            </p>
            <div className="mt-3 flex items-center text-xs font-bold text-teal-600 gap-1">
              <span>Xem chi tiết</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          {/* Tile 2: Recipes */}
          <button
            onClick={() => onNavigateTab('recipes')}
            className="p-5 bg-white rounded-2xl border border-emerald-100 hover:border-emerald-400 hover:shadow-md transition-all text-left group cursor-pointer"
          >
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <ChefHat className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-extrabold text-slate-900 group-hover:text-emerald-700 transition-colors">
              Công Thức Món Ăn
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              Quản lý định lượng, khẩu phần và hướng dẫn nấu
            </p>
            <div className="mt-3 flex items-center text-xs font-bold text-emerald-600 gap-1">
              <span>Xem chi tiết</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          {/* Tile 3: Users */}
          <button
            onClick={() => onNavigateTab('users')}
            className="p-5 bg-white rounded-2xl border border-emerald-100 hover:border-cyan-400 hover:shadow-md transition-all text-left group cursor-pointer"
          >
            <div className="w-11 h-11 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Users className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-extrabold text-slate-900 group-hover:text-cyan-700 transition-colors">
              Tài Khoản Người Dùng
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              Theo dõi danh sách khách hàng và trạng thái hoạt động
            </p>
            <div className="mt-3 flex items-center text-xs font-bold text-cyan-600 gap-1">
              <span>Xem chi tiết</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          {/* Tile 4: Transactions */}
          <button
            onClick={() => onNavigateTab('transactions')}
            className="p-5 bg-white rounded-2xl border border-emerald-100 hover:border-green-400 hover:shadow-md transition-all text-left group cursor-pointer"
          >
            <div className="w-11 h-11 rounded-xl bg-green-50 text-green-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <CreditCard className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-extrabold text-slate-900 group-hover:text-green-700 transition-colors">
              Lịch Sử Thanh Toán
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              Tra cứu đơn hàng mua gói và trạng thái PayOS
            </p>
            <div className="mt-3 flex items-center text-xs font-bold text-green-600 gap-1">
              <span>Xem chi tiết</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManagerDashboard;
