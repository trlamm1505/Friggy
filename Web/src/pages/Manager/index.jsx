import React, { useState } from 'react';
import ManagerSidebar from './Sidebar/ManagerSidebar';
import ManagerHeader from './Header/ManagerHeader';
import ManagerDashboard from './Dashboard/ManagerDashboard';
import UserManagement from './UserManagement/UserManagement';
import PackageManagement from './PackageManagement/PackageManagement';
export const ManagerPage = ({ onExitManager }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [stats, setStats] = useState({});
  const [users, setUsers] = useState([]);
  const [packages, setPackages] = useState([]);
  const [transactions, setTransactions] = useState([]);

  return (
    <div className="min-h-screen bg-[#f4faf6] font-sans text-slate-800 flex selection:bg-teal-200 selection:text-teal-900">
      <ManagerSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        onExitManager={onExitManager}
      />

      <div className="flex-1 flex flex-col min-w-0 lg:pl-72 transition-all duration-300">
        <ManagerHeader
          activeTab={activeTab}
          setMobileOpen={setMobileOpen}
          onExitManager={onExitManager}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {activeTab === 'dashboard' && (
            <ManagerDashboard
              stats={stats}
              transactions={transactions}
              packages={packages}
              onNavigateTab={setActiveTab}
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
            />
          )}
        </main>
      </div>
    </div>
  );
};

export default ManagerPage;
