import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import GuestPage from '../pages/Guest';
import Login from '../pages/Guest/Login/Login';
import AdminLayout from '../pages/Admin/AdminLayout';
import AdminDashboard from '../pages/Admin/Dashboard/AdminDashboard';
import UserManagement from '../pages/Admin/UserManagement/UserManagement';
import PackageManagement from '../pages/Admin/PackageManagement/PackageManagement';
import AdminSettings from '../pages/Admin/Settings/AdminSettings';
import AdminProfile from '../pages/Admin/Profile/AdminProfile';
import AiManagement from '../pages/Admin/AiManagement/AiManagement';
import CronManagement from '../pages/Admin/CronManagement/CronManagement';
import SponsorManagement from '../pages/Admin/SponsorManagement/SponsorManagement';
import IngredientManagement from '../pages/Admin/IngredientManagement/IngredientManagement';
import RecipeManagement from '../pages/Admin/RecipeManagement/RecipeManagement';
import PaymentTransactionsManagement from '../pages/Admin/PaymentTransactions/PaymentTransactionsManagement';
import FamilyInviteAction from '../pages/Guest/FamilyInviteAction';

// Manager Portal Components
import ManagerLayout from '../pages/Manager/ManagerLayout';
import ManagerDashboard from '../pages/Manager/Dashboard/ManagerDashboard';
import ManagerIngredientManagement from '../pages/Manager/IngredientManagement/IngredientManagement';
import ManagerRecipeManagement from '../pages/Manager/RecipeManagement/RecipeManagement';
import ManagerUserManagement from '../pages/Manager/UserManagement/UserManagement';
import ManagerPaymentTransactionsManagement from '../pages/Manager/PaymentTransactions/PaymentTransactionsManagement';
import ManagerSponsorManagement from '../pages/Manager/SponsorManagement/SponsorManagement';
import ManagerPackageManagement from '../pages/Manager/PackageManagement/PackageManagement';
import ManagerProfile from '../pages/Manager/Profile/ManagerProfile';
import ManagerSettings from '../pages/Manager/Settings/ManagerSettings';

const enableAdminLogin =
  import.meta.env.VITE_ENABLE_ADMIN_LOGIN === 'true' ||
  import.meta.env.VITE_ENABLE_ADMIN_LOGIN === true;

function Router() {
  return (
    <Routes>
      <Route path="/" element={<GuestPage />} />
      <Route path="family/accept" element={<FamilyInviteAction />} />
      <Route path="family/reject" element={<FamilyInviteAction />} />

      {enableAdminLogin ? (
        <>
          <Route path="login" element={<Login />} />
          
          {/* Admin Routes */}
          <Route path="admin" element={<AdminLayout />}>
            <Route path="" element={<AdminDashboard />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="ingredients" element={<IngredientManagement />} />
            <Route path="recipes" element={<RecipeManagement />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="transactions" element={<PaymentTransactionsManagement />} />
            <Route path="ai" element={<AiManagement />} />
            <Route path="cron" element={<CronManagement />} />
            <Route path="sponsors" element={<SponsorManagement />} />
            <Route path="packages" element={<PackageManagement />} />
            <Route path="profile" element={<AdminProfile />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>

          {/* Manager Routes */}
          <Route path="manager" element={<ManagerLayout />}>
            <Route path="" element={<ManagerDashboard />} />
            <Route path="dashboard" element={<ManagerDashboard />} />
            <Route path="ingredients" element={<ManagerIngredientManagement />} />
            <Route path="recipes" element={<ManagerRecipeManagement />} />
            <Route path="users" element={<ManagerUserManagement />} />
            <Route path="transactions" element={<ManagerPaymentTransactionsManagement />} />
            <Route path="sponsors" element={<ManagerSponsorManagement />} />
            <Route path="packages" element={<ManagerPackageManagement />} />
            <Route path="profile" element={<ManagerProfile />} />
            <Route path="settings" element={<ManagerSettings />} />
          </Route>
        </>
      ) : (
        <>
          <Route path="login" element={<Navigate to="/" replace />} />
          <Route path="admin/*" element={<Navigate to="/" replace />} />
          <Route path="manager/*" element={<Navigate to="/" replace />} />
        </>
      )}

      <Route path="*" element={<GuestPage />} />
    </Routes>
  );
}

export default Router;