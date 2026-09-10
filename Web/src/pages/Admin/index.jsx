import React, { useState } from 'react';
import AdminSidebar from './Sidebar/AdminSidebar';
import AdminHeader from './Header/AdminHeader';
import AdminDashboard from './Dashboard/AdminDashboard';
import UserManagement from './UserManagement/UserManagement';
import PackageManagement from './PackageManagement/PackageManagement';
import AdminSettings from './Settings/AdminSettings';
import {
  initialStats,
  initialUsers,
  initialPackages,
  initialTransactions,
} from '../../data/adminMockData';

export const AdminPage = ({ onExitAdmin }) => {
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'users' | 'packages' | 'settings'
  const [mobileOpen, setMobileOpen] = useState(false);
  const [stats, setStats] = useState(initialStats);
  const [users, setUsers] = useState(initialUsers);
  const [packages, setPackages] = useState(initialPackages);
  const [transactions, setTransactions] = useState(initialTransactions);
  const [openAddPackageModal, setOpenAddPackageModal] = useState(false);

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-800 flex selection:bg-emerald-200 selection:text-emerald-900">
      {/* Sidebar Navigation */}
      <AdminSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        onExitAdmin={onExitAdmin}
      />

      {/* Main Right Content Layout */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-72 transition-all duration-300">
        {/* Top Header */}
        <AdminHeader
          activeTab={activeTab}
          setMobileOpen={setMobileOpen}
          onExitAdmin={onExitAdmin}
        />

        {/* Tab Content Container */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {activeTab === 'dashboard' && (
            <AdminDashboard
              stats={stats}
              transactions={transactions}
              packages={packages}
              onNavigateTab={setActiveTab}
              onOpenAddPackage={() => {
                setActiveTab('packages');
                setOpenAddPackageModal(true);
              }}
            />
          )}

          {activeTab === 'users' && (
            <UserManagement
              users={users}
              setUsers={setUsers}
              packages={packages}
            />
          )}

          {activeTab === 'packages' && (
            <PackageManagement
              packages={packages}
              setPackages={setPackages}
              openAddModal={openAddPackageModal}
              setOpenAddModal={setOpenAddPackageModal}
            />
          )}

          {activeTab === 'settings' && <AdminSettings />}
        </main>
      </div>
    </div>
  );
};

export default AdminPage;
