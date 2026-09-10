import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useOutletContext } from 'react-router-dom';
import { Plus, Sparkles } from 'lucide-react';
import { AddEditPackageModal } from './AddEditPackageModal';
import { PackageCard } from '../../../components/common/PackageCard';

export const PackageManagement = (props) => {
  const context = useOutletContext() || {};
  const packages = props.packages || context.packages || [];
  const setPackages = props.setPackages || context.setPackages;
  const openAddModal = props.openAddModal ?? context.openAddPackageModal;
  const setOpenAddModal = props.setOpenAddModal || context.setOpenAddPackageModal;
  const [editingPackage, setEditingPackage] = useState(null);

  const handleSavePackage = (savedPkg) => {
    setPackages((prev) => {
      const exists = prev.some((p) => p.id === savedPkg.id);
      if (exists) {
        return prev.map((p) => (p.id === savedPkg.id ? savedPkg : p));
      } else {
        return [...prev, savedPkg];
      }
    });
    setEditingPackage(null);
    setOpenAddModal(false);
  };

  const handleDeletePackage = (pkgId) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa gói dịch vụ này?')) {
      setPackages((prev) => prev.filter((p) => p.id !== pkgId));
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Action Banner */}
      <div className="p-6 sm:p-8 rounded-[32px] bg-white border border-emerald-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl sm:text-2xl font-black text-emerald-950 tracking-tight flex items-center gap-2">
            <span>Danh Sách Gói Cước Dịch Vụ</span>
            <Sparkles className="w-5 h-5 text-emerald-600" />
          </h3>
          <p className="text-xs sm:text-sm text-emerald-900/65 font-medium mt-1">
            Quản lý bảng giá, các tính năng đặc quyền và trạng thái hiển thị của từng gói dịch vụ.
          </p>
        </div>

        <button
          onClick={() => setOpenAddModal(true)}
          className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-emerald-600/20 hover:scale-105 transition-all duration-200 cursor-pointer flex items-center gap-2 self-start md:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Thêm Gói Cước Mới</span>
        </button>
      </div>

      {/* Package Grid - 3 Columns matching Guest layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
        {packages.map((pkg, idx) => (
          <PackageCard
            key={pkg.id}
            plan={pkg}
            mode="admin"
            index={idx}
            onEdit={(packageToEdit) => setEditingPackage(packageToEdit)}
            onDelete={(idToDelete) => handleDeletePackage(idToDelete)}
          />
        ))}
      </div>

      {/* Add / Edit Package Modal */}
      {(openAddModal || editingPackage) && (
        <AddEditPackageModal
          packageItem={editingPackage}
          onClose={() => {
            setOpenAddModal(false);
            setEditingPackage(null);
          }}
          onSave={handleSavePackage}
        />
      )}
    </div>
  );
};

export default PackageManagement;
