import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import ManagerSidebar from './Sidebar/ManagerSidebar';
import ManagerHeader from './Header/ManagerHeader';
import { logoutHelper } from '../../services/authService';

export const ManagerLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logoutHelper();
    navigate('/', { replace: true });
  };

  const getActiveTab = () => {
    if (location.pathname.includes('/manager/ingredients')) return 'ingredients';
    if (location.pathname.includes('/manager/recipes')) return 'recipes';
    if (location.pathname.includes('/manager/users')) return 'users';
    if (location.pathname.includes('/manager/transactions')) return 'transactions';
    if (location.pathname.includes('/manager/sponsors')) return 'sponsors';
    if (location.pathname.includes('/manager/packages')) return 'packages';
    if (location.pathname.includes('/manager/profile')) return 'profile';
    return 'dashboard';
  };

  const activeTab = getActiveTab();

  return (
    <div className="min-h-screen bg-[#f4faf6] font-sans text-slate-800 flex selection:bg-teal-200 selection:text-teal-900">
      {/* Sidebar Navigation */}
      <ManagerSidebar
        activeTab={activeTab}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        onExitManager={handleLogout}
      />

      {/* Main Right Content Layout */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-72 transition-all duration-300">
        {/* Top Header */}
        <ManagerHeader
          activeTab={activeTab}
          setMobileOpen={setMobileOpen}
          onExitManager={handleLogout}
        />

        {/* Tab Content Container */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <div key={location.pathname} className="animate__animated animate__fadeIn animate__faster">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default ManagerLayout;
