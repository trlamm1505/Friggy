import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  DollarSign,
  TrendingUp,
  Calendar,
  ChevronRight,
  Utensils,
  ChefHat,
  CreditCard,
} from 'lucide-react';
import goodMorningImg from '../../../assets/images/goodmorning-Photoroom.png';
import goodAfternoonImg from '../../../assets/images/goodafternoon-Photoroom.png';
import goodEveningImg from '../../../assets/images/goodevening-Photoroom.png';
import { getAdminStatsOverviewApi } from '../../../services/adminService';
import { getIngredientsApi } from '../../../services/ingredientService';
import { getRecipesApi } from '../../../services/recipeService';
import AnimatedCounter from '../../../components/common/AnimatedCounter';

export const ManagerDashboard = (props) => {
  const navigate = useNavigate();

  const [overviewData, setOverviewData] = useState(null);
  const [totalIngredients, setTotalIngredients] = useState(0);
  const [totalRecipes, setTotalRecipes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [revenueMode, setRevenueMode] = useState('month'); // 'month' | 'total'

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
        const [overviewRes, ingredientsRes, recipesRes] = await Promise.allSettled([
          getAdminStatsOverviewApi(),
          getIngredientsApi({ limit: 1 }),
          getRecipesApi({ limit: 1 }),
        ]);

        if (overviewRes.status === 'fulfilled') {
          const val = overviewRes.value;
          setOverviewData(val?.data || val || {});
        }
        if (ingredientsRes.status === 'fulfilled') {
          const val = ingredientsRes.value;
          const resData = val?.data || val;
          setTotalIngredients(resData?.total ?? 0);
        }
        if (recipesRes.status === 'fulfilled') {
          const val = recipesRes.value;
          const resData = val?.data || val;
          setTotalRecipes(resData?.total ?? 0);
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
    const namePart = managerName ? `, ${managerName}` : '';
    if (hour >= 5 && hour < 12) {
      return {
        title: `Chào buổi sáng${namePart}! ☀️`,
        sub: 'Chúc bạn một ngày làm việc hiệu quả và tràn đầy năng lượng!',
        img: goodMorningImg,
      };
    } else if (hour >= 12 && hour < 18) {
      return {
        title: `Chào buổi chiều${namePart}! 🌤️`,
        sub: 'Cùng kiểm tra tiến độ vận hành và tình hình kho thực phẩm hôm nay.',
        img: goodAfternoonImg,
      };
    } else {
      return {
        title: `Chào buổi tối${namePart}! 🌙`,
        sub: 'Tổng kết hoạt động hệ thống và chuẩn bị cho ngày làm việc tiếp theo.',
        img: goodEveningImg,
      };
    }
  };

  const greeting = getGreetingData();

  // Đọc chính xác các trường trả về từ API backend /admin/stats/overview
  const totalUsers = overviewData?.totalUsers ?? overviewData?.users?.total ?? 0;
  const activeUsers = overviewData?.activeUsers ?? overviewData?.users?.active ?? 0;
  const suspendedUsers = overviewData?.suspendedUsers ?? 0;
  const revenueThisMonthVnd =
    overviewData?.revenueThisMonthVnd ?? overviewData?.revenue?.thisMonthVnd ?? 0;
  const totalRevenueVnd =
    overviewData?.totalRevenueVnd ?? overviewData?.revenue?.totalVnd ?? 0;

  const statCards = [
    {
      title: 'TỔNG NGƯỜI DÙNG',
      numericValue: totalUsers,
      growth: `Active: ${activeUsers}`,
      icon: Users,
      bgColor: 'bg-emerald-50',
      textColor: 'text-emerald-600',
      borderColor: 'border-emerald-200',
      subtext: `Hoạt động: ${activeUsers} • Bị khóa: ${suspendedUsers}`,
    },
    {
      title: 'KHO NGUYÊN LIỆU',
      numericValue: totalIngredients,
      growth: 'Nguyên liệu',
      icon: Utensils,
      bgColor: 'bg-teal-50',
      textColor: 'text-teal-600',
      borderColor: 'border-teal-200',
      subtext: 'Tổng số nguyên liệu trong kho hệ thống',
    },
    {
      title: 'DOANH THU FRIGGY',
      isRevenueCard: true,
      numericValue: revenueMode === 'month' ? revenueThisMonthVnd : totalRevenueVnd,
      isCurrency: true,
      growth: revenueMode === 'month' ? 'Tháng này' : 'Toàn thời gian',
      icon: DollarSign,
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
      borderColor: 'border-green-200',
      subtext:
        revenueMode === 'month'
          ? 'Doanh thu phát sinh trong tháng'
          : 'Tổng doanh thu toàn thời gian',
    },
    {
      title: 'CÔNG THỨC MÓN ĂN',
      numericValue: totalRecipes,
      growth: 'Món ăn',
      icon: ChefHat,
      bgColor: 'bg-emerald-50',
      textColor: 'text-emerald-600',
      borderColor: 'border-emerald-200',
      subtext: 'Công thức nấu ăn & gợi ý AI',
    },
  ];

  return (
    <div className="space-y-6 sm:space-y-8 animate__animated animate__fadeIn">
      {/* ── Top Hero Greeting Banner (Matches Admin style) ──────────────── */}
      <div className="p-6 sm:p-8 lg:p-10 rounded-[32px] bg-gradient-to-r from-[#dcfce7] via-[#eaf6ef] to-[#d1fae5] text-emerald-950 relative overflow-hidden shadow-xs border border-emerald-200/90 animate__animated animate__fadeInDown">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-600/10 border border-emerald-600/20 text-emerald-800 text-xs font-bold">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              <span>
                {new Date().toLocaleDateString('vi-VN', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-emerald-950 animate__animated animate__fadeInLeft">
              {greeting.title}
            </h2>

            <p className="text-xs sm:text-sm text-emerald-900/75 font-semibold leading-relaxed">
              {greeting.sub} Dưới đây là các chỉ số vận hành và tương tác người dùng trong hệ sinh thái Friggy.
            </p>
          </div>

          {/* Time-of-day dynamic mascot image (Large size matching Admin) */}
          <div className="flex items-center justify-center md:justify-end shrink-0">
            <img
              src={greeting.img}
              alt="Friggy Greeting Mascot"
              className="w-52 h-52 sm:w-64 sm:h-64 md:w-72 md:h-72 lg:w-80 lg:h-80 -my-3 lg:-my-6 object-contain drop-shadow-lg relative z-10 animate__animated animate__zoomIn"
            />
          </div>
        </div>
      </div>

      {/* ── Key Operational Metrics (Identical to Admin card design) ──── */}
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {statCards.map((card) => {
            const IconComponent = card.icon;
            return (
              <div
                key={card.title}
                className="p-6 rounded-[28px] bg-white border border-slate-100 shadow-md hover:shadow-xl transition-all duration-300 group relative overflow-hidden animate__animated animate__fadeInUp"
              >
                <div className="flex items-center justify-between mb-4">
                  <div
                    className={`w-12 h-12 rounded-2xl ${card.bgColor} ${card.textColor} border ${card.borderColor} flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform`}
                  >
                    <IconComponent className="w-6 h-6" />
                  </div>

                  {card.isRevenueCard ? (
                    <div className="inline-flex items-center p-0.5 rounded-full bg-emerald-50 border border-emerald-200 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => setRevenueMode('month')}
                        className={`px-2.5 py-0.5 rounded-full text-xs font-black transition-all cursor-pointer ${
                          revenueMode === 'month'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-emerald-700 hover:text-emerald-900'
                        }`}
                      >
                        Tháng
                      </button>
                      <button
                        type="button"
                        onClick={() => setRevenueMode('total')}
                        className={`px-2.5 py-0.5 rounded-full text-xs font-black transition-all cursor-pointer ${
                          revenueMode === 'total'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-emerald-700 hover:text-emerald-900'
                        }`}
                      >
                        Tổng
                      </button>
                    </div>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-black border border-emerald-200">
                      <TrendingUp className="w-3 h-3" />
                      {card.growth}
                    </span>
                  )}
                </div>

                <p className="text-[11px] font-extrabold text-slate-400 tracking-wider uppercase">
                  {card.title}
                </p>

                <h3 className="text-2xl font-black text-slate-900 my-1 tracking-tight flex items-center">
                  {card.isCurrency ? (
                    <AnimatedCounter
                      end={card.numericValue}
                      duration={1.5}
                      separator="."
                      suffix=" ₫"
                    />
                  ) : (
                    <AnimatedCounter
                      end={card.numericValue}
                      duration={1.8}
                      separator="."
                    />
                  )}
                </h3>
                <p className="text-[11px] text-slate-500 font-semibold">{card.subtext}</p>
              </div>
            );
          })}
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
              Tra cứu đơn hàng mua gói và trạng thái giao dịch Friggy
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
