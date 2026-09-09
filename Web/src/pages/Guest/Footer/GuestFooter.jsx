import React from 'react';
import { Heart, Phone, Mail, Clock } from 'lucide-react';
import { footerData } from '../../../data';

export const GuestFooter = () => {
  return (
    <footer className="bg-[#062319] text-white pt-14 pb-8 border-t border-emerald-900/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-10 border-b border-emerald-900/40">
          {/* Col 1: Logo & Slogan (4 cols) */}
          <div className="md:col-span-4 space-y-4 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-3">
              <div className="w-11 h-11 rounded-2xl overflow-hidden bg-gradient-to-tr from-emerald-500 to-green-400 p-0.5 shadow-md flex items-center justify-center">
                <img
                  src={footerData.mascotImage}
                  alt="Friggy Mascot Logo"
                  className="w-full h-full object-cover rounded-xl bg-white"
                />
              </div>
              <div className="flex items-baseline">
                <span className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                  Fri
                </span>
                <span className="text-2xl sm:text-3xl font-black tracking-tight text-emerald-400">
                  ggy
                </span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block ml-1"></span>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-emerald-200/80 font-medium max-w-sm leading-relaxed">
              {footerData.slogan}
            </p>
          </div>

          {/* Col 2: Thông tin liên hệ & Hotline (5 cols) */}
          <div className="md:col-span-5 space-y-3.5 text-left pl-0 md:pl-4">
            <h4 className="text-sm font-bold text-emerald-400 uppercase tracking-wider">
              Thông Tin Liên Hệ & Hỗ Trợ
            </h4>
            
            <div className="space-y-3 text-xs sm:text-sm text-emerald-100/90 font-medium">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-900/60 border border-emerald-700/50 flex items-center justify-center text-emerald-400 flex-shrink-0">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-emerald-300 text-xs block sm:inline">Hotline / SĐT Hỗ Trợ: </span>
                  <a href={footerData.hotlineTel} className="font-bold text-white hover:text-emerald-400 transition-colors">
                    {footerData.hotline}
                  </a>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-900/60 border border-emerald-700/50 flex items-center justify-center text-emerald-400 flex-shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-emerald-300 text-xs block sm:inline">Email Trợ Giúp: </span>
                  <a href={footerData.emailMailto} className="font-bold text-white hover:text-emerald-400 transition-colors">
                    {footerData.email}
                  </a>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-900/60 border border-emerald-700/50 flex items-center justify-center text-emerald-400 flex-shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-emerald-300 text-xs block sm:inline">Thời Gian Làm Việc: </span>
                  <span className="font-semibold text-white">{footerData.workingHours}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Col 3: Liên kết nhanh (3 cols) */}
          <div className="md:col-span-3 space-y-3.5 text-center md:text-left">
            <h4 className="text-sm font-bold text-emerald-400 uppercase tracking-wider">
              Liên Kết Nhanh
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm text-emerald-200/80 font-medium">
              {footerData.quickLinks.map((link, idx) => (
                <li key={idx}>
                  <a href={link.href} className="hover:text-white transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Copyright notice */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-emerald-300/70 font-medium">
          <p>© {new Date().getFullYear()} {footerData.brandName} Inc. Bảo lưu mọi quyền.</p>
          <p className="flex items-center gap-1">
            Thiết kế với <Heart className="w-3.5 h-3.5 text-rose-500 fill-current inline" /> dành cho gia đình Việt
          </p>
        </div>
      </div>
    </footer>
  );
};

export default GuestFooter;
