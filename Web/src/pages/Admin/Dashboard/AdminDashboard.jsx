import React, { useEffect, useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import {
  Users,
  DollarSign,
  TrendingUp,
  PackageCheck,
  Calendar,
  ChevronRight,
  Cpu,
  PieChart,
  UserPlus,
  Store,
  ShoppingBasket,
  CheckCircle2,
  Clock,
  ArrowRight,
  CreditCard,
  ShieldCheck,
  AlertCircle,
  Building2,
} from 'lucide-react';
import goodMorningImg from '../../../assets/images/goodmorning-Photoroom.png';
import goodAfternoonImg from '../../../assets/images/goodafternoon-Photoroom.png';
import goodEveningImg from '../../../assets/images/goodevening-Photoroom.png';
import {
  getAdminStatsOverviewApi,
  getAdminStatsAiUsageApi,
  getAdminStatsSubscriptionsApi,
  getAdminPlansApi,
} from '../../../services/adminService';
import { getAdminSupplierPlansApi } from '../../../services/supplierService';
import { getMeApi } from '../../../services/userService';
import AnimatedCounter from '../../../components/common/AnimatedCounter';

export const AdminDashboard = (props) => {
  const context = useOutletContext() || {};
  const navigate = useNavigate();

  // Stats Data States
  const [overviewData, setOverviewData] = useState(null);
  const [aiUsageData, setAiUsageData] = useState(null);
  const [subscriptionBreakdown, setSubscriptionBreakdown] = useState({
    users: [],
    suppliers: [],
  });
  const [activePlanTab, setActivePlanTab] = useState('users'); // 'users' | 'suppliers'
  const [loading, setLoading] = useState(true);
  const [aiDays, setAiDays] = useState(7);
  const [revenueMode, setRevenueMode] = useState('month'); // 'month' | 'total'
  const [revenueSource, setRevenueSource] = useState('combined'); // 'combined' | 'users' | 'suppliers'

  const onNavigateTab = props.onNavigateTab || ((tab) => navigate(`/admin/${tab}`));

  // Helper to resolve avatar URL path
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

  // Synchronously get cached admin name & avatar from localStorage
  const getInitialAdminInfo = () => {
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

  const initialInfo = getInitialAdminInfo();
  const [adminName, setAdminName] = useState(initialInfo.name);
  const [adminAvatarUrl, setAdminAvatarUrl] = useState(initialInfo.avatarUrl);

  // Fetch all Stats APIs & User Profile
  const fetchAllStats = async () => {
    setLoading(true);
    try {
      const [overviewRes, aiUsageRes, subRes, plansRes, supPlansRes, meRes] = await Promise.allSettled([
        getAdminStatsOverviewApi(),
        getAdminStatsAiUsageApi(aiDays),
        getAdminStatsSubscriptionsApi(),
        getAdminPlansApi(),
        getAdminSupplierPlansApi(),
        getMeApi(),
      ]);

      if (overviewRes.status === 'fulfilled') {
        const data = overviewRes.value?.data || overviewRes.value;
        setOverviewData(data);
      }
      if (aiUsageRes.status === 'fulfilled') {
        setAiUsageData(aiUsageRes.value?.data || aiUsageRes.value);
      }

      // ── Process Subscriptions Breakdown ────────────────────────────
      let rawSub = subRes.status === 'fulfilled' ? (subRes.value?.data ?? subRes.value) : null;
      let rawUserSubs = [];
      let rawSupplierSubs = [];
      if (Array.isArray(rawSub)) {
        rawUserSubs = rawSub;
      } else if (rawSub) {
        rawUserSubs = Array.isArray(rawSub.users) ? rawSub.users : [];
        rawSupplierSubs = Array.isArray(rawSub.suppliers) ? rawSub.suppliers : [];
      }

      let systemUserPlans = [];
      if (plansRes.status === 'fulfilled') {
        const pData = plansRes.value?.data ?? plansRes.value;
        systemUserPlans = Array.isArray(pData) ? pData : [];
      }

      let systemSupplierPlans = [];
      if (supPlansRes.status === 'fulfilled') {
        const spData = supPlansRes.value?.data ?? supPlansRes.value;
        systemSupplierPlans = Array.isArray(spData) ? spData : [];
      }

      // Merge user plans with breakdown counts
      let mergedUserPlans = [];
      if (systemUserPlans.length > 0) {
        mergedUserPlans = systemUserPlans.map((plan) => {
          const match = rawUserSubs.find(
            (s) => s.plan?.id === plan.id || s.planId === plan.id || s.plan?.name === plan.name
          );
          return {
            planId: plan.id,
            plan: {
              id: plan.id,
              name: plan.name,
              displayName: plan.displayName || plan.name,
              priceVnd: plan.priceVnd !== undefined ? plan.priceVnd : (plan.price || 0),
              billingCycle: plan.billingCycle,
            },
            activeSubscribers: match ? (match.activeSubscribers ?? 0) : 0,
          };
        });
      } else if (rawUserSubs.length > 0) {
        mergedUserPlans = rawUserSubs.map((s, idx) => ({
          planId: s.plan?.id || s.planId || idx + 1,
          plan: s.plan || { id: idx + 1, name: `Gói #${idx + 1}` },
          activeSubscribers: s.activeSubscribers ?? 0,
        }));
      }

      // Merge supplier plans with breakdown counts
      let mergedSupplierPlans = [];
      if (systemSupplierPlans.length > 0) {
        mergedSupplierPlans = systemSupplierPlans.map((plan) => {
          const match = rawSupplierSubs.find(
            (s) => s.plan?.id === plan.id || s.planId === plan.id || s.plan?.name === plan.name
          );
          return {
            planId: plan.id,
            plan: {
              id: plan.id,
              name: plan.name,
              displayName: plan.displayName || plan.name,
              priceVnd: plan.priceVnd !== undefined ? plan.priceVnd : (plan.price || 0),
              billingCycle: plan.billingCycle,
            },
            activeSubscribers: match ? (match.activeSubscribers ?? 0) : 0,
          };
        });
      } else if (rawSupplierSubs.length > 0) {
        mergedSupplierPlans = rawSupplierSubs.map((s, idx) => ({
          planId: s.plan?.id || s.planId || idx + 1,
          plan: s.plan || { id: idx + 1, name: `Gói NCC #${idx + 1}` },
          activeSubscribers: s.activeSubscribers ?? 0,
        }));
      }

      setSubscriptionBreakdown({
        users: mergedUserPlans,
        suppliers: mergedSupplierPlans,
      });

      if (meRes.status === 'fulfilled') {
        const me = meRes.value?.data || meRes.value;
        if (me) {
          try {
            localStorage.setItem('friggy_user', JSON.stringify(me));
            localStorage.setItem('user', JSON.stringify(me));
          } catch (e) {}
          const fetchedName =
            me.name ||
            me.profile?.name ||
            (me.googleEmail ? me.googleEmail.split('@')[0] : null) ||
            (me.email ? me.email.split('@')[0] : null) ||
            '';
          const fetchedAvatar = me.profile?.avatarUrl || me.avatarUrl || me.profile?.avatarPath || me.avatarPath || null;
          setAdminName(fetchedName);
          setAdminAvatarUrl(fetchedAvatar);
        }
      }
    } catch (err) {
      console.error('Lỗi khi lấy dữ liệu thống kê Admin:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllStats();

    const handleProfileUpdate = () => {
      getMeApi()
        .then((res) => {
          const me = res?.data || res;
          if (me) {
            try {
              localStorage.setItem('friggy_user', JSON.stringify(me));
              localStorage.setItem('user', JSON.stringify(me));
            } catch (e) {}
            const fetchedName =
              me.name ||
              me.profile?.name ||
              (me.googleEmail ? me.googleEmail.split('@')[0] : null) ||
              (me.email ? me.email.split('@')[0] : null) ||
              '';
            const fetchedAvatar = me.profile?.avatarUrl || me.avatarUrl || me.profile?.avatarPath || me.avatarPath || null;
            setAdminName(fetchedName);
            setAdminAvatarUrl(fetchedAvatar);
          }
        })
        .catch(() => {});
    };

    window.addEventListener('user_profile_updated', handleProfileUpdate);
    return () => window.removeEventListener('user_profile_updated', handleProfileUpdate);
  }, [aiDays]);

  // Greeting based on time
  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    const namePart = adminName ? `, ${adminName}` : '';
    if (hour >= 5 && hour < 12) {
      return { title: `Chào buổi sáng${namePart}! ☀️`, image: goodMorningImg, alt: 'Good Morning' };
    } else if (hour >= 12 && hour < 18) {
      return { title: `Chào buổi chiều${namePart}! 🌤️`, image: goodAfternoonImg, alt: 'Good Afternoon' };
    } else {
      return { title: `Chào buổi tối${namePart}! 🌙`, image: goodEveningImg, alt: 'Good Evening' };
    }
  };

  const timeGreeting = getTimeGreeting();

  // ─── Extract Data matching Backend GET /admin/stats/overview ───────────
  const usersStats = overviewData?.users || {};
  const suppliersStats = overviewData?.suppliers || {};
  const combinedStats = overviewData?.combined || {};

  // User Stats
  const totalUsers = usersStats.total ?? overviewData?.totalUsers ?? 0;
  const activeUsers = usersStats.active ?? overviewData?.activeUsers ?? 0;
  const suspendedUsers = usersStats.suspended ?? overviewData?.suspendedUsers ?? 0;
  const newUsersThisMonth = usersStats.newThisMonth ?? overviewData?.newUsersThisMonth ?? 0;
  const activeUserSubscriptions = usersStats.activeSubscriptions ?? overviewData?.activeSubscriptions ?? 0;
  const userRevenueThisMonth = usersStats.revenueThisMonthVnd ?? overviewData?.revenueThisMonthVnd ?? 0;
  const userTotalRevenue = usersStats.totalRevenueVnd ?? overviewData?.totalRevenueVnd ?? 0;

  // Supplier Stats
  const totalSuppliers = suppliersStats.total ?? 0;
  const verifiedSuppliers = suppliersStats.verified ?? 0;
  const activeSupplierSubscriptions = suppliersStats.activeSubscriptions ?? 0;
  const pendingApplications = suppliersStats.pendingApplications ?? 0;
  const pendingIngredients = suppliersStats.pendingIngredients ?? 0;
  const supplierRevenueThisMonth = suppliersStats.revenueThisMonthVnd ?? 0;
  const supplierTotalRevenue = suppliersStats.totalRevenueVnd ?? 0;

  // Combined Stats (Gộp cả User & Supplier)
  const combinedRevenueThisMonth =
    combinedStats.revenueThisMonthVnd ?? (userRevenueThisMonth + supplierRevenueThisMonth);
  const combinedTotalRevenue =
    combinedStats.totalRevenueVnd ?? (userTotalRevenue + supplierTotalRevenue);

  // Determine active revenue value based on mode & source
  const getSelectedRevenueValue = () => {
    if (revenueSource === 'users') {
      return revenueMode === 'month' ? userRevenueThisMonth : userTotalRevenue;
    }
    if (revenueSource === 'suppliers') {
      return revenueMode === 'month' ? supplierRevenueThisMonth : supplierTotalRevenue;
    }
    return revenueMode === 'month' ? combinedRevenueThisMonth : combinedTotalRevenue;
  };

  const formatVnd = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
  };

  // Subscription plans display calculation with guaranteed fallbacks
  const displayedUserPlans =
    subscriptionBreakdown.users.length > 0
      ? subscriptionBreakdown.users
      : [
          {
            planId: 1,
            plan: { id: 1, name: 'free', displayName: 'Gói Miễn Phí (Free)', priceVnd: 0, billingCycle: 'Vĩnh viễn' },
            activeSubscribers: Math.max(0, totalUsers - activeUserSubscriptions),
          },
          {
            planId: 2,
            plan: { id: 2, name: 'individual_pro', displayName: 'Individual Pro', priceVnd: 49000, billingCycle: 'Tháng' },
            activeSubscribers: activeUserSubscriptions,
          },
          {
            planId: 3,
            plan: { id: 3, name: 'family_pro', displayName: 'Family Pro', priceVnd: 99000, billingCycle: 'Tháng' },
            activeSubscribers: 0,
          },
        ];

  const displayedSupplierPlans =
    subscriptionBreakdown.suppliers.length > 0
      ? subscriptionBreakdown.suppliers
      : [
          {
            planId: 1,
            plan: { id: 1, name: 'basic', displayName: 'Gói Đối Tác Cơ Bản', priceVnd: 500000, billingCycle: 'Tháng' },
            activeSubscribers: activeSupplierSubscriptions,
          },
          {
            planId: 2,
            plan: { id: 2, name: 'premium', displayName: 'Gói Đối Tác VIP', priceVnd: 1200000, billingCycle: 'Năm' },
            activeSubscribers: 0,
          },
        ];

  const displayedPlans = activePlanTab === 'users' ? displayedUserPlans : displayedSupplierPlans;

  // 4 Top Cards
  const statCards = [
    {
      title: 'TỔNG DOANH THU TOÀN DIỆN',
      isRevenueCard: true,
      numericValue: getSelectedRevenueValue(),
      isCurrency: true,
      growth: revenueMode === 'month' ? 'Tháng này' : 'Toàn thời gian',
      icon: DollarSign,
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
      borderColor: 'border-green-200',
      subtext: `User: ${formatVnd(revenueMode === 'month' ? userRevenueThisMonth : userTotalRevenue)} • NCC: ${formatVnd(revenueMode === 'month' ? supplierRevenueThisMonth : supplierTotalRevenue)}`,
    },
    {
      title: 'NGƯỜI DÙNG CÁ NHÂN',
      numericValue: totalUsers,
      growth: `+${newUsersThisMonth} mới`,
      icon: Users,
      bgColor: 'bg-emerald-50',
      textColor: 'text-emerald-600',
      borderColor: 'border-emerald-200',
      subtext: `Hoạt động: ${activeUsers} • Bị khóa: ${suspendedUsers}`,
      onClick: () => onNavigateTab('users'),
    },
    {
      title: 'ĐỐI TÁC CUNG ỨNG',
      numericValue: totalSuppliers,
      growth: `${verifiedSuppliers} Đạt chuẩn`,
      icon: Store,
      bgColor: 'bg-teal-50',
      textColor: 'text-teal-600',
      borderColor: 'border-teal-200',
      subtext: `Gói cước active: ${activeSupplierSubscriptions} • Xác minh: ${verifiedSuppliers}/${totalSuppliers}`,
      onClick: () => onNavigateTab('suppliers'),
    },
    {
      title: 'GÓI DỊCH VỤ ĐANG DUY TRÌ',
      numericValue: activeUserSubscriptions + activeSupplierSubscriptions,
      growth: 'Active Plans',
      icon: PackageCheck,
      bgColor: 'bg-indigo-50',
      textColor: 'text-indigo-600',
      borderColor: 'border-indigo-200',
      subtext: `Người dùng: ${activeUserSubscriptions} gói • Đối tác NCC: ${activeSupplierSubscriptions} gói`,
      onClick: () => onNavigateTab('packages'),
    },
  ];

  // Helper formatting for feature types
  const formatFeatureName = (type) => {
    switch (type) {
      case 'scan_ingredient':
      case 'ingredient_scan':
        return { name: 'Quét Ảnh Nguyên Liệu Tủ Lạnh', icon: '📸' };
      case 'recipe_suggest':
      case 'recipe_generation':
        return { name: 'Gợi Ý Món Ăn Tự Động', icon: '🍳' };
      case 'chat_assistant':
      case 'fridge_chat':
        return { name: 'Trợ Lý Tư Vấn Friggy AI', icon: '💬' };
      default:
        return { name: type, icon: '🤖' };
    }
  };

  return (
    <div className="space-y-8 pb-12 animate__animated animate__fadeIn animate__faster">
      {/* ── Welcome Banner ───────────────────────────────────────────── */}
      <div className="p-6 sm:p-8 lg:p-10 rounded-[32px] bg-gradient-to-r from-[#dcfce7] via-[#eaf6ef] to-[#d1fae5] text-emerald-950 relative overflow-hidden shadow-xs border border-emerald-200/90 animate__animated animate__fadeInDown">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
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
              {timeGreeting.title}
            </h2>

            <p className="text-xs sm:text-sm text-emerald-900/75 font-semibold leading-relaxed">
              Báo cáo tổng quan hệ sinh thái Friggy: Người dùng cá nhân, Đối tác nhà cung cấp, Doanh thu gộp và lượt gọi AI Engine trực tiếp từ hệ thống.
            </p>
          </div>

          {/* Time-of-day dynamic mascot image */}
          <div className="flex items-center justify-center md:justify-end shrink-0">
            <img
              src={timeGreeting.image}
              alt={timeGreeting.alt}
              className="w-52 h-52 sm:w-64 sm:h-64 md:w-72 md:h-72 lg:w-80 lg:h-80 -my-3 lg:-my-6 object-contain drop-shadow-lg relative z-10 animate__animated animate__zoomIn"
            />
          </div>
        </div>
      </div>

      {/* ── SECTION 1: Top Overview Stat Cards ───────────────────────── */}
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {statCards.map((card) => {
            const IconComponent = card.icon;
            return (
              <div
                key={card.title}
                onClick={card.onClick}
                className={`p-6 rounded-[28px] bg-white border border-slate-100 shadow-md hover:shadow-xl transition-all duration-300 group relative overflow-hidden animate__animated animate__fadeInUp ${
                  card.onClick ? 'cursor-pointer hover:-translate-y-0.5' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div
                    className={`w-12 h-12 rounded-2xl ${card.bgColor} ${card.textColor} border ${card.borderColor} flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform`}
                  >
                    <IconComponent className="w-6 h-6" />
                  </div>

                  {card.isRevenueCard ? (
                    <div className="flex flex-col items-end gap-1.5">
                      {/* Period switch */}
                      <div className="inline-flex items-center p-0.5 rounded-full bg-emerald-50 border border-emerald-200 shadow-2xs">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRevenueMode('month');
                          }}
                          className={`px-2 py-0.5 rounded-full text-[11px] font-black transition-all cursor-pointer ${
                            revenueMode === 'month'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'text-emerald-700 hover:text-emerald-900'
                          }`}
                        >
                          Tháng
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRevenueMode('total');
                          }}
                          className={`px-2 py-0.5 rounded-full text-[11px] font-black transition-all cursor-pointer ${
                            revenueMode === 'total'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'text-emerald-700 hover:text-emerald-900'
                          }`}
                        >
                          Tổng
                        </button>
                      </div>

                      {/* Source selector */}
                      <div className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRevenueSource('combined');
                          }}
                          className={`px-1.5 py-0.5 rounded-md transition-colors ${
                            revenueSource === 'combined'
                              ? 'bg-slate-200 text-slate-900 font-black'
                              : 'hover:text-slate-900'
                          }`}
                        >
                          Gộp
                        </button>
                        <span>•</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRevenueSource('users');
                          }}
                          className={`px-1.5 py-0.5 rounded-md transition-colors ${
                            revenueSource === 'users'
                              ? 'bg-slate-200 text-slate-900 font-black'
                              : 'hover:text-slate-900'
                          }`}
                        >
                          User
                        </button>
                        <span>•</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRevenueSource('suppliers');
                          }}
                          className={`px-1.5 py-0.5 rounded-md transition-colors ${
                            revenueSource === 'suppliers'
                              ? 'bg-slate-200 text-slate-900 font-black'
                              : 'hover:text-slate-900'
                          }`}
                        >
                          NCC
                        </button>
                      </div>
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

      {/* ── SECTION 2: Supplier Operations & Pending Reviews (NCC) ─ */}
      <div className="bg-white rounded-[32px] p-6 sm:p-8 border border-emerald-100 shadow-md space-y-6 animate__animated animate__fadeInUp">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                Quản Trị Đối Tác Cung Ứng & Kiểm Duyệt Chờ Xử Lý
                {(pendingApplications > 0 || pendingIngredients > 0) && (
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping"></span>
                )}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Theo dõi tình trạng đơn đăng ký đối tác, sản phẩm nguyên liệu mới và doanh thu gói cước
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigateTab('suppliers')}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Xem Đối Tác</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onNavigateTab('supplier-ingredients')}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <span>Kiểm Duyệt NL</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Action Banners Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Pending Applications Card */}
          <div
            onClick={() => onNavigateTab('suppliers')}
            className={`p-5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
              pendingApplications > 0
                ? 'bg-amber-50/70 border-amber-200 hover:bg-amber-50 shadow-xs'
                : 'bg-slate-50 border-slate-200 hover:bg-slate-100/80'
            }`}
          >
            <div className="flex items-center gap-3.5">
              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                  pendingApplications > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-600'
                }`}
              >
                <Store className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Đơn Đăng Ký Đối Tác
                </div>
                <div className="text-base sm:text-lg font-black text-slate-900 mt-0.5">
                  {pendingApplications > 0 ? (
                    <span className="text-amber-800">
                      <strong className="text-amber-700 text-xl">{pendingApplications}</strong> đơn đang chờ duyệt
                    </span>
                  ) : (
                    <span className="text-emerald-700 flex items-center gap-1 text-sm font-extrabold">
                      <CheckCircle2 className="w-4 h-4" /> Đã xét duyệt toàn bộ
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 text-xs font-extrabold text-amber-800 shrink-0">
              <span>{pendingApplications > 0 ? 'Xử lý ngay' : 'Chi tiết'}</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>

          {/* Pending Ingredients Card */}
          <div
            onClick={() => onNavigateTab('supplier-ingredients')}
            className={`p-5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
              pendingIngredients > 0
                ? 'bg-rose-50/70 border-rose-200 hover:bg-rose-50 shadow-xs'
                : 'bg-slate-50 border-slate-200 hover:bg-slate-100/80'
            }`}
          >
            <div className="flex items-center gap-3.5">
              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                  pendingIngredients > 0 ? 'bg-rose-100 text-rose-700' : 'bg-slate-200 text-slate-600'
                }`}
              >
                <ShoppingBasket className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Kiểm Duyệt Nguyên Liệu NCC
                </div>
                <div className="text-base sm:text-lg font-black text-slate-900 mt-0.5">
                  {pendingIngredients > 0 ? (
                    <span className="text-rose-800">
                      <strong className="text-rose-700 text-xl">{pendingIngredients}</strong> nguyên liệu chờ duyệt
                    </span>
                  ) : (
                    <span className="text-emerald-700 flex items-center gap-1 text-sm font-extrabold">
                      <CheckCircle2 className="w-4 h-4" /> Đã duyệt toàn bộ
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 text-xs font-extrabold text-rose-800 shrink-0">
              <span>{pendingIngredients > 0 ? 'Kiểm duyệt' : 'Chi tiết'}</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Supplier Summary Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Doanh Thu NCC Tháng
            </span>
            <p className="text-sm font-black text-emerald-700">
              {formatVnd(supplierRevenueThisMonth)}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Tổng Doanh Thu NCC
            </span>
            <p className="text-sm font-black text-slate-900">
              {formatVnd(supplierTotalRevenue)}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Đối Tác Xác Minh
            </span>
            <p className="text-sm font-black text-slate-900">
              {verifiedSuppliers} / {totalSuppliers}{' '}
              <span className="text-[10px] text-teal-600 font-bold">
                ({totalSuppliers > 0 ? Math.round((verifiedSuppliers / totalSuppliers) * 100) : 0}%)
              </span>
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Gói Đối Tác Đang Mua
            </span>
            <p className="text-sm font-black text-slate-900">
              {activeSupplierSubscriptions}{' '}
              <span className="text-[10px] text-slate-500 font-normal">doanh nghiệp</span>
            </p>
          </div>
        </div>
      </div>

      {/* ── SECTION 3: Two Column Layout for AI Usage & Subscriptions ─ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI Usage Breakdown */}
        <div className="p-6 rounded-[32px] bg-white border border-slate-100 shadow-md space-y-5 flex flex-col justify-between animate__animated animate__fadeInLeft">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-emerald-600" />
                  Lượt Sử Dụng AI theo Tính Năng
                </h3>
              </div>

              {/* Day filter selector */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setAiDays(7)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    aiDays === 7 ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  7 Ngày
                </button>
                <button
                  onClick={() => setAiDays(30)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    aiDays === 30 ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  30 Ngày
                </button>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 flex items-center justify-between">
              <span className="text-xs font-extrabold text-emerald-900">
                Tổng số lượt gọi AI ({aiUsageData?.period || `${aiDays} ngày`}):
              </span>
              <span className="text-xl font-black text-emerald-700 flex items-center gap-1">
                <AnimatedCounter end={aiUsageData?.totalCalls ?? 0} duration={2} separator="." /> lượt
              </span>
            </div>

            {/* Breakdown List */}
            {!aiUsageData?.breakdown || aiUsageData.breakdown.length === 0 ? (
              <div className="py-8 text-center text-slate-400 font-semibold text-xs">
                Chưa có dữ liệu lượt gọi AI trong thời gian này.
              </div>
            ) : (
              <div className="space-y-3">
                {aiUsageData.breakdown.map((item) => {
                  const info = formatFeatureName(item.featureType);
                  const total = aiUsageData.totalCalls || 1;
                  const percent = Math.round((item.count / total) * 100);

                  return (
                    <div
                      key={item.featureType}
                      className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2 animate__animated animate__fadeInUp"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-black text-slate-800 flex items-center gap-1.5">
                          <span>{info.icon}</span>
                          <span>{info.name}</span>
                        </span>
                        <span className="font-extrabold text-emerald-700">
                          <AnimatedCounter end={item.count} duration={1.5} separator="." /> lượt ({percent}%)
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                        <div
                          style={{ width: `${Math.max(percent, 5)}%` }}
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full transition-all duration-700 ease-out"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <button
            onClick={() => onNavigateTab('ai')}
            className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer"
          >
            <span>Đến Quản Lý AI Engine</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Subscriptions Breakdown */}
        <div className="p-6 rounded-[32px] bg-white border border-slate-100 shadow-md space-y-5 flex flex-col justify-between animate__animated animate__fadeInRight">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
              <div>
                <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-emerald-600" />
                  <span>Phân Bổ Gói Cước {activePlanTab === 'users' ? 'Người Dùng' : 'Nhà Cung Cấp'}</span>
                </h3>
              </div>

              {/* Sub-tab switcher: Người dùng | Nhà cung cấp */}
              <div className="flex items-center gap-2">
                <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setActivePlanTab('users')}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      activePlanTab === 'users'
                        ? 'bg-white text-emerald-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Người Dùng
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivePlanTab('suppliers')}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      activePlanTab === 'suppliers'
                        ? 'bg-white text-emerald-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Nhà Cung Cấp
                  </button>
                </div>

                <span className="px-3 py-1 rounded-full bg-teal-50 text-teal-700 text-xs font-black border border-teal-200 hidden sm:inline-flex items-center gap-1">
                  <AnimatedCounter
                    end={activePlanTab === 'users' ? activeUserSubscriptions : activeSupplierSubscriptions}
                    duration={2}
                    separator="."
                  />{' '}
                  Active
                </span>
              </div>
            </div>

            {displayedPlans.length === 0 ? (
              <div className="py-12 text-center text-slate-400 font-semibold text-xs">
                Chưa có dữ liệu phân bổ gói cước.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {displayedPlans.map((sub, idx) => {
                  const planName = sub.plan?.displayName || sub.plan?.name || `Gói #${sub.planId || idx + 1}`;
                  const count = sub.activeSubscribers ?? 0;
                  const price = sub.plan?.priceVnd;

                  return (
                    <div
                      key={sub.planId || idx}
                      className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-emerald-50/40 border border-slate-200/80 space-y-2 animate__animated animate__zoomIn hover:border-emerald-300 transition-all shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                          {sub.plan?.billingCycle ? `CHU KỲ: ${sub.plan.billingCycle.toUpperCase()}` : `GÓI #${sub.planId || idx + 1}`}
                        </span>
                        {price !== undefined && (
                          <span className="text-[11px] font-black text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                            {price === 0 ? 'Miễn phí' : `${formatVnd(price)}`}
                          </span>
                        )}
                      </div>

                      <h4 className="font-black text-slate-900 text-sm truncate" title={planName}>{planName}</h4>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                        <span className="text-xs text-slate-500 font-semibold">Đang kích hoạt:</span>
                        <span className="text-lg font-black text-emerald-700 flex items-center gap-1">
                          <AnimatedCounter end={count} duration={1.5} separator="." />{' '}
                          <span className="text-xs font-normal text-slate-400">
                            {activePlanTab === 'users' ? 'user' : 'đối tác'}
                          </span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <button
            onClick={() => onNavigateTab('packages')}
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer shadow-md"
          >
            <span>Đến Quản Lý Gói Cước</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
