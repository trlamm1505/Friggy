import React from 'react';
import { Routes, Route } from 'react-router-dom';
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

// Routes configuration
export const routes = [
  {
    path: "",
    element: <GuestPage />,
    nested: []
  },
  {
    path: "login",
    element: <Login />,
    nested: []
  },
  {
    path: "admin",
    element: <AdminLayout />,
    nested: [
      {
        path: "",
        element: <AdminDashboard />
      },
      {
        path: "dashboard",
        element: <AdminDashboard />
      },
      {
        path: "ingredients",
        element: <IngredientManagement />
      },
      {
        path: "users",
        element: <UserManagement />
      },
      {
        path: "ai",
        element: <AiManagement />
      },
      {
        path: "cron",
        element: <CronManagement />
      },
      {
        path: "sponsors",
        element: <SponsorManagement />
      },
      {
        path: "packages",
        element: <PackageManagement />
      },
      {
        path: "profile",
        element: <AdminProfile />
      },
      {
        path: "settings",
        element: <AdminSettings />
      }
    ]
  }
];

// Generate routes function
export const generateRoutes = (routes) => {
  return routes.map((route) => {
    if (route.nested && route.nested.length > 0) {
      return (
        <Route path={route.path} element={route.element} key={route.path}>
          {route.nested.map((nestedRoute) => (
            <Route
              path={nestedRoute.path}
              element={nestedRoute.element}
              key={nestedRoute.path}
            />
          ))}
        </Route>
      );
    }
    return <Route path={route.path} element={route.element} key={route.path} />;
  });
};

function Router() {
  return (
    <Routes>
      {generateRoutes(routes)}
      <Route path="*" element={<GuestPage />} />
    </Routes>
  );
}

export default Router;