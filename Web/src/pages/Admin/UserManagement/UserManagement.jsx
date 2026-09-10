import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useOutletContext } from 'react-router-dom';
import {
  Search,
  Filter,
  Eye,
  Edit,
  Lock,
  Unlock,
  CheckCircle,
  AlertTriangle,
  UserPlus,
  Shield,
  Download,
} from 'lucide-react';
import { UserDetailModal } from './UserDetailModal';
import { UserEditModal } from './UserEditModal';

export const UserManagement = (props) => {
  const context = useOutletContext() || {};
  const users = props.users || context.users || [];
  const setUsers = props.setUsers || context.setUsers;
  const packages = props.packages || context.packages || [];
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All'); // 'All' | 'Active' | 'Banned'
  const [selectedUser, setSelectedUser] = useState(null);
  const [editingUser, setEditingUser] = useState(null);

  // Filtered users calculation
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.phone.includes(searchTerm);

    const matchesStatus =
      statusFilter === 'All' ? true : u.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Handle Save Edited User
  const handleSaveUser = (updatedUser) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === updatedUser.id ? updatedUser : u))
    );
    setEditingUser(null);
  };

  // Handle Toggle Lock / Unlock User
  const handleToggleLockUser = (userId) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          const newStatus = u.status === 'Active' ? 'Banned' : 'Active';
          return { ...u, status: newStatus };
        }
        return u;
      })
    );
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Action & Search Bar */}
      <div className="p-6 rounded-[32px] bg-white border border-slate-100 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search Field */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo Tên, Username, Email hoặc SĐT..."
            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition-all"
          />
        </div>

        {/* Filter & Add Actions */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Status Filter Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-2xl border border-slate-200">
            <Filter className="w-3.5 h-3.5 text-slate-400 ml-2" />
            <button
              onClick={() => setStatusFilter('All')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'All'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Tất cả ({users.length})
            </button>
            <button
              onClick={() => setStatusFilter('Active')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'Active'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setStatusFilter('Banned')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'Banned'
                  ? 'bg-white text-rose-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Bị khóa
            </button>
          </div>
        </div>
      </div>

      {/* Main Users Table */}
      <div className="p-6 rounded-[32px] bg-white border border-slate-100 shadow-md space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight">
              Danh Sách Tài Khoản Người Dùng ({filteredUsers.length})
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Quản lý chi tiết danh sách tài khoản, thông tin gói cước và phân quyền
            </p>
          </div>
        </div>

        {filteredUsers.length === 0 ? (
          <div className="py-12 text-center text-slate-400 font-semibold text-sm">
            Không tìm thấy người dùng phù hợp với tìm kiếm.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[850px]">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/80 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4 rounded-l-2xl">Thành Viên</th>
                  <th className="py-3.5 px-4">Thông Tin Liên Hệ</th>
                  <th className="py-3.5 px-4">Gói Dịch Vụ</th>
                  <th className="py-3.5 px-4">Trạng Thái</th>
                  <th className="py-3.5 px-4">Ngày Tham Gia</th>
                  <th className="py-3.5 px-4 rounded-r-2xl text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredUsers.map((u) => (
                  <tr
                    key={u.id}
                    className="hover:bg-slate-50/80 transition-colors font-semibold text-slate-800 group"
                  >
                    {/* Member Name & Avatar */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={u.avatar}
                          alt={u.name}
                          className="w-10 h-10 rounded-2xl object-cover border border-slate-200 bg-slate-100 shadow-2xs"
                        />
                        <div>
                          <p className="font-black text-slate-900 group-hover:text-emerald-700 transition-colors">
                            {u.name}
                          </p>
                          <p className="text-[11px] text-slate-400 font-medium">@{u.username}</p>
                        </div>
                      </div>
                    </td>

                    {/* Contact Info */}
                    <td className="py-4 px-4">
                      <div>
                        <p className="font-bold text-slate-800">{u.email}</p>
                        <p className="text-[11px] text-slate-500">{u.phone}</p>
                      </div>
                    </td>

                    {/* Package Badge */}
                    <td className="py-4 px-4">
                      <span
                        className={`px-3 py-1 rounded-xl text-[11px] font-extrabold border ${
                          u.packageCode === 'FREE'
                            ? 'bg-slate-100 text-slate-700 border-slate-200'
                            : u.packageCode === 'FAMILY_VIP'
                            ? 'bg-teal-50 text-teal-700 border-teal-200'
                            : u.packageCode === 'CHEF_PRO'
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        {u.package}
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td className="py-4 px-4">
                      {u.status === 'Active' ? (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-extrabold border border-emerald-200 inline-flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                          Hoạt động
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 text-[11px] font-extrabold border border-rose-200 inline-flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                          Bị khóa
                        </span>
                      )}
                    </td>

                    {/* Join Date */}
                    <td className="py-4 px-4 text-slate-500 font-medium">{u.joinDate}</td>

                    {/* Actions */}
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* View Detail */}
                        <button
                          onClick={() => setSelectedUser(u)}
                          className="p-2 rounded-xl text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                          title="Xem Chi Tiết"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Edit */}
                        <button
                          onClick={() => setEditingUser(u)}
                          className="p-2 rounded-xl text-slate-500 hover:text-teal-700 hover:bg-teal-50 transition-colors cursor-pointer"
                          title="Chỉnh Sửa"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        {/* Toggle Lock / Unlock */}
                        <button
                          onClick={() => handleToggleLockUser(u.id)}
                          className={`p-2 rounded-xl transition-colors cursor-pointer ${
                            u.status === 'Active'
                              ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                              : 'text-amber-600 hover:text-emerald-700 hover:bg-emerald-50'
                          }`}
                          title={u.status === 'Active' ? 'Khóa Tài Khoản' : 'Mở Khóa Tài Khoản'}
                        >
                          {u.status === 'Active' ? (
                            <Lock className="w-4 h-4" />
                          ) : (
                            <Unlock className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {selectedUser && (
        <UserDetailModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onEdit={(u) => setEditingUser(u)}
        />
      )}

      {editingUser && (
        <UserEditModal
          user={editingUser}
          packages={packages}
          onClose={() => setEditingUser(null)}
          onSave={handleSaveUser}
        />
      )}
    </div>
  );
};

export default UserManagement;
