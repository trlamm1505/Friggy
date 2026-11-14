import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import SupplierSidebar from './Sidebar/SupplierSidebar';
import SupplierHeader from './Header/SupplierHeader';
import { logoutHelper } from '../../services/authService';
import { getSupplierProfileApi } from '../../services/supplierService';
import { showToast } from '../../components/common/Toast';

export const SupplierLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const fetchProfile = async () => {
    try {
      const res = await getSupplierProfileApi();
      const data = res?.data || res;
      setProfile(data);
    } catch (e) {
      if (e?.status === 404) setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      await logoutHelper();
      showToast.success('Đã đăng xuất khỏi Cổng Nhà Cung Cấp');
    } catch (e) {
      showToast.error('Lỗi khi đăng xuất');
    }
    navigate('/', { replace: true });
  };

  const getActiveTab = () => {
    if (location.pathname.includes('/supplier/profile')) return 'profile';
    if (location.pathname.includes('/supplier/ingredients')) return 'ingredients';
    if (location.pathname.includes('/supplier/subscription')) return 'subscription';
    if (location.pathname.includes('/supplier/payment-history')) return 'payment-history';
    return 'dashboard';
  };

  const activeTab = getActiveTab();
  const isVerified = Boolean(profile?.isVerified);

  return (
    <div className="min-h-screen bg-[#f4faf6] font-sans text-slate-800 flex selection:bg-emerald-200 selection:text-emerald-900">
      {/* Sidebar Navigation */}
      <SupplierSidebar
        activeTab={activeTab}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        onExitSupplier={handleLogout}
        isVerified={isVerified}
      />

      {/* Main Right Content Layout */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-72 transition-all duration-300">
        {/* Top Header */}
        <SupplierHeader
          activeTab={activeTab}
          setMobileOpen={setMobileOpen}
          onExitSupplier={handleLogout}
          profile={profile}
        />

        {/* Tab Content Container */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 w-full max-w-[1680px] mx-auto">
          <div key={location.pathname} className="animate__animated animate__fadeIn animate__faster">
            <Outlet context={{ profile, setProfile, isVerified, refreshProfile: fetchProfile, profileLoading }} />
          </div>
        </main>
      </div>
    </div>
  );
};

export default SupplierLayout;

