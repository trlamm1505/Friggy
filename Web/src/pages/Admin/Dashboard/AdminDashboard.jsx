import React from 'react';
import { motion } from 'framer-motion';
import { useOutletContext, useNavigate } from 'react-router-dom';
import {
  Users,
  CreditCard,
  DollarSign,
  TrendingUp,
  PackageCheck,
  ArrowUpRight,
  Sparkles,
  Calendar,
  ChevronRight,
} from 'lucide-react';
import { revenueMonthlyData } from '../../../data/adminMockData';
import goodMorningImg from '../../../assets/images/goodmorning-Photoroom.png';
import goodAfternoonImg from '../../../assets/images/goodafternoon-Photoroom.png';
import goodEveningImg from '../../../assets/images/goodevening-Photoroom.png';

export const AdminDashboard = (props) => {
  const context = useOutletContext() || {};
  const navigate = useNavigate();

  const stats = props.stats || context.stats;
  const transactions = props.transactions || context.transactions;
  const packages = props.packages || context.packages;
  const onNavigateTab = props.onNavigateTab || ((tab) => navigate(`/admin/${tab}`));

  // Determine time-of-day mascot image & greeting
  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      return {
        title: 'Chào buổi sáng, Admin! ☀️',
        image: goodMorningImg,
        alt: 'Good Morning Friggy',
      };
    } else if (hour >= 12 && hour < 18) {
      return {
        title: 'Chào buổi chiều, Admin! 🌤️',
        image: goodAfternoonImg,
        alt: 'Good Afternoon Friggy',
      };
    } else {
      return {
        title: 'Chào buổi tối, Admin! 🌙',
        image: goodEveningImg,
        alt: 'Good Evening Friggy',
      };
    }
  };

  const timeGreeting = getTimeGreeting();

  if (!stats || !transactions || !packages) return null;
  // Format currency VNĐ
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const statCards = [
    {
      title: 'TỔNG NGƯỜI DÙNG',
      value: stats.totalUsers.toLocaleString('vi-VN'),
      growth: stats.usersGrowth,
      icon: Users,
      color: 'from-emerald-500 to-green-600',
      textColor: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
      subtext: 'Người dùng hệ thống Friggy',
    },
    {
      title: 'USER MUA GÓI (ACTIVE)',
      value: stats.activeSubscribers.toLocaleString('vi-VN'),
      growth: stats.subscribersGrowth,
      icon: PackageCheck,
      color: 'from-teal-500 to-emerald-600',
      textColor: 'text-teal-600',
      bgColor: 'bg-teal-50',
      borderColor: 'border-teal-200',
      subtext: 'Thành viên dùng Premium & VIP',
    },
    {
      title: 'TỔNG DOANH THU MUA GÓI',
      value: formatCurrency(stats.totalRevenue),
      growth: stats.revenueGrowth,
      icon: DollarSign,
      color: 'from-green-600 to-emerald-700',
      textColor: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      subtext: 'Doanh thu tích lũy từ bán gói',
    },
    {
      title: 'TỔNG LƯỢT MUA GÓI',
      value: stats.packagesSold.toLocaleString('vi-VN'),
      growth: stats.packagesGrowth,
      icon: CreditCard,
      color: 'from-indigo-500 to-emerald-600',
      textColor: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-200',
      subtext: 'Giao dịch mua gói đã kích hoạt',
    },
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* Welcome Banner */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 sm:p-8 rounded-[32px] bg-gradient-to-r from-[#dcfce7] via-[#eaf6ef] to-[#d1fae5] text-emerald-950 relative overflow-hidden shadow-xs border border-emerald-200/90"
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-600/10 border border-emerald-600/20 text-emerald-800 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Hệ Thống Quản Trị Trung Tâm Friggy AI</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-emerald-950">
              {timeGreeting.title}
            </h2>
            <p className="text-xs sm:text-sm text-emerald-900/75 font-semibold leading-relaxed">
              Theo dõi doanh thu bán gói cước, số lượng người dùng và hiệu suất của hệ thống Friggy AI trong thời gian thực.
            </p>
          </div>

          {/* Time-of-day dynamic mascot image */}
          <div className="flex items-center justify-center md:justify-end flex-shrink-0">
            <img
              src={timeGreeting.image}
              alt={timeGreeting.alt}
              className="w-36 h-36 sm:w-44 sm:h-44 md:w-52 md:h-52 object-contain drop-shadow-md hover:scale-105 transition-transform duration-300 pointer-events-none"
            />
          </div>
        </div>
      </motion.div>

      {/* 4 Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="p-6 rounded-[28px] bg-white border border-emerald-100/90 shadow-md shadow-emerald-950/5 hover:border-emerald-300 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold text-slate-400 tracking-wider">
                  {card.title}
                </span>
                <div
                  className={`w-11 h-11 rounded-2xl bg-gradient-to-tr ${card.color} text-white flex items-center justify-center shadow-md shadow-emerald-900/10 group-hover:scale-110 transition-transform`}
                >
                  <Icon className="w-5 h-5" />
                </div>
              </div>

              <div className="mt-4 space-y-1">
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  {card.value}
                </h3>
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="font-semibold text-slate-500 text-[11px]">
                    {card.subtext}
                  </span>
                  <span className="font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-200/50">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    {card.growth}
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Charts & Distribution Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Revenue Trend Chart Visual */}
        <div className="lg:col-span-8 p-6 sm:p-8 rounded-[32px] bg-white border border-emerald-100/90 shadow-md shadow-emerald-950/5 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>Biểu Đồ Tăng Trưởng Doanh Thu Bán Gói</span>
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Thống kê số dư doanh thu qua các tháng (Đơn vị: Triệu VNĐ)
              </p>
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200">
              Năm 2026
            </span>
          </div>

          {/* Custom Visual Bar Chart */}
          <div className="h-64 flex items-end justify-between gap-3 pt-6 px-2">
            {revenueMonthlyData.map((item) => {
              const heightPercent = (item.revenue / 800) * 100;
              return (
                <div key={item.month} className="flex-1 flex flex-col items-center gap-2 group">
                  <span className="text-[11px] font-extrabold text-emerald-700 opacity-0 group-hover:opacity-100 transition-opacity bg-emerald-50 px-2 py-0.5 rounded-md">
                    {item.revenue}M
                  </span>
                  <div className="w-full max-w-[48px] bg-slate-100 rounded-2xl h-48 flex items-end overflow-hidden p-1">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${heightPercent}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className="w-full rounded-xl bg-gradient-to-t from-emerald-600 via-green-500 to-teal-400 group-hover:from-emerald-500 group-hover:to-teal-300 shadow-sm"
                    />
                  </div>
                  <span className="text-xs font-bold text-slate-600">{item.month}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Package Distribution Visual Card */}
        <div className="lg:col-span-4 p-6 sm:p-8 rounded-[32px] bg-white border border-emerald-100/90 shadow-md shadow-emerald-950/5 flex flex-col justify-between space-y-6">
          <div className="space-y-1 border-b border-emerald-100 pb-4">
            <h3 className="text-lg font-black text-slate-900 tracking-tight">
              Tỷ Lệ Đăng Ký Gói Cước
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Phân bổ người dùng theo từng gói dịch vụ
            </p>
          </div>

          <div className="space-y-4 my-auto">
            {packages.map((pkg) => {
              const totalSubs = packages.reduce((acc, p) => acc + p.subscribersCount, 0);
              const percentage = Math.round((pkg.subscribersCount / totalSubs) * 100);

              return (
                <div key={pkg.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-extrabold text-slate-800 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      {pkg.name}
                    </span>
                    <span className="font-black text-slate-900">
                      {pkg.subscribersCount.toLocaleString()} ({percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-emerald-50 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={() => onNavigateTab('packages')}
            className="w-full py-3 px-4 rounded-2xl bg-emerald-50/80 hover:bg-emerald-100/80 text-emerald-800 font-bold text-xs border border-emerald-200/60 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <span>Quản Lý Chi Tiết Gói Cước</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Recent Purchases Transaction Table */}
      <div className="p-6 sm:p-8 rounded-[32px] bg-white border border-emerald-100/90 shadow-md shadow-emerald-950/5 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-emerald-100 pb-5">
          <div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>Giao Dịch Mua Gói Cước Mới Nhất</span>
              <Calendar className="w-5 h-5 text-emerald-600" />
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Danh sách lượt mua gói cước thành công gần đây từ người dùng
            </p>
          </div>

          <button
            onClick={() => onNavigateTab('users')}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-900 hover:underline flex items-center gap-1 cursor-pointer self-start sm:self-auto"
          >
            <span>Xem tất cả người dùng</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-emerald-100 bg-emerald-50/60 text-[11px] font-black text-emerald-900 uppercase tracking-wider">
                <th className="py-3.5 px-4 rounded-l-2xl">Mã Giao Dịch</th>
                <th className="py-3.5 px-4">Người Dùng</th>
                <th className="py-3.5 px-4">Gói Đã Mua</th>
                <th className="py-3.5 px-4">Số Tiền</th>
                <th className="py-3.5 px-4">Cổng Thanh Toán</th>
                <th className="py-3.5 px-4">Trạng Thái</th>
                <th className="py-3.5 px-4 rounded-r-2xl">Thời Gian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {transactions.map((txn) => (
                <tr
                  key={txn.id}
                  className="hover:bg-slate-50/80 transition-colors font-semibold text-slate-800"
                >
                  <td className="py-4 px-4 font-extrabold text-emerald-700">{txn.id}</td>
                  <td className="py-4 px-4">
                    <div>
                      <p className="font-black text-slate-900">{txn.user}</p>
                      <p className="text-[11px] text-slate-400 font-medium">{txn.email}</p>
                    </div>
                  </td>
                  <td className="py-4 px-4 font-bold text-slate-700">{txn.package}</td>
                  <td className="py-4 px-4 font-black text-emerald-700">
                    {formatCurrency(txn.amount)}
                  </td>
                  <td className="py-4 px-4">
                    <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 text-[11px] font-bold border border-slate-200">
                      {txn.paymentMethod}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    {txn.status === 'Completed' ? (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-extrabold border border-emerald-200 inline-flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Thành công
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-[11px] font-extrabold border border-amber-200 inline-flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                        Đang xử lý
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-slate-500 font-medium">{txn.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
