import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import AdminSidebar from './Sidebar/AdminSidebar';
import AdminHeader from './Header/AdminHeader';
import {
  initialStats,
  initialUsers,
  initialPackages,
  initialTransactions,
} from '../../data/adminMockData';

export const AdminLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [stats, setStats] = useState(initialStats);
  const [users, setUsers] = useState(initialUsers);
  const [packages, setPackages] = useState(initialPackages);
  const [transactions, setTransactions] = useState(initialTransactions);
  const [openAddPackageModal, setOpenAddPackageModal] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const getActiveTab = () => {
    if (location.pathname.includes('/admin/users')) return 'users';
    if (location.pathname.includes('/admin/packages')) return 'packages';
    if (location.pathname.includes('/admin/profile')) return 'profile';
    if (location.pathname.includes('/admin/settings')) return 'settings';
    return 'dashboard';
  };

  const activeTab = getActiveTab();

  return (
    <div className="min-h-screen bg-[#f4faf6] font-sans text-slate-800 flex selection:bg-emerald-200 selection:text-emerald-900">
      {/* Sidebar Navigation */}
      <AdminSidebar
        activeTab={activeTab}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        onExitAdmin={() => navigate('/', { replace: true })}
      />

      {/* Main Right Content Layout */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-72 transition-all duration-300">
        {/* Top Header */}
        <AdminHeader
          activeTab={activeTab}
          setMobileOpen={setMobileOpen}
          onExitAdmin={() => navigate('/', { replace: true })}
        />

        {/* Tab Content Container */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet
            context={{
              stats,
              setStats,
              users,
              setUsers,
              packages,
              setPackages,
              transactions,
              setTransactions,
              openAddPackageModal,
              setOpenAddPackageModal,
            }}
          />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
