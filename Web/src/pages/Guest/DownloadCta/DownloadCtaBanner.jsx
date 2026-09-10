import React from 'react';
import { motion } from 'framer-motion';
import { Apple, QrCode as QrIcon, Sparkles, ShieldCheck, ArrowRight } from 'lucide-react';
import qrCodeImg from '../../../assets/images/qr_code.png';

const GooglePlayIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5" {...props}>
    <path d="M3.609 1.814L13.792 12 3.61 22.186a2.37 2.37 0 0 1-.61-1.637V3.451c0-.624.225-1.2.609-1.637zM15.206 13.414l2.457 2.457-12.012 6.864 9.555-9.321zm2.457-2.828l3.414 1.95a1.4 1.4 0 0 1 0 2.457l-3.414 1.95-2.6-2.601 2.6-2.601zM5.651 1.265l12.012 6.864-2.457 2.457-9.555-9.321z"/>
  </svg>
);

export const DownloadCtaBanner = () => {
  return (
    <section id="download" className="py-20 bg-gradient-to-b from-white via-emerald-50/40 to-emerald-100/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 40 }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.7, ease: [0.25, 1, 0.5, 1] }}
          whileHover={{ scale: 1.005 }}
          className="relative rounded-[40px] bg-gradient-to-br from-emerald-100/90 via-emerald-50 to-white p-8 sm:p-12 lg:p-16 text-emerald-950 shadow-xl overflow-hidden border border-emerald-200/80"
        >
          {/* Glowing background shapes */}
          <div className="absolute top-0 right-0 -mt-16 -mr-16 w-[400px] h-[400px] bg-emerald-300/30 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 -mb-16 -ml-16 w-80 h-80 bg-teal-200/30 rounded-full blur-3xl pointer-events-none"></div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center relative z-10">
            {/* Left Column Text */}
            <div className="lg:col-span-8 space-y-6 text-center lg:text-left">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-emerald-950 leading-tight tracking-tight">
                Biến Chiếc Tủ Lạnh Trở Thành <br className="hidden sm:inline" />
                <span className="bg-gradient-to-r from-emerald-600 via-green-600 to-teal-700 bg-clip-text text-transparent">
                  Đầu Bếp Thông Minh Nhất
                </span>{' '}
                Căn Nhà
              </h2>

              <p className="text-base sm:text-lg text-emerald-800/85 font-medium max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                Tải ứng dụng Friggy hoàn toàn miễn phí trên iOS & Android. Tiết kiệm chi phí đi chợ, ăn uống lành mạnh và nấu ăn vui vẻ hơn mỗi ngày cùng cả gia đình.
              </p>

              {/* Download Buttons */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-2">
                <a
                  href="#ios"
                  className="flex items-center gap-3 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3.5 rounded-2xl font-bold text-sm shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5 group"
                >
                  <Apple className="w-7 h-7 text-white group-hover:scale-110 transition-transform" />
                  <div className="text-left">
                    <div className="text-[10px] text-emerald-100 font-bold uppercase tracking-wider">Tải trên</div>
                    <div className="text-sm font-extrabold leading-tight">App Store</div>
                  </div>
                </a>

                <a
                  href="#android"
                  className="flex items-center gap-3 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3.5 rounded-2xl font-bold text-sm shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5 group"
                >
                  <div className="w-7 h-7 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                    <GooglePlayIcon />
                  </div>
                  <div className="text-left">
                    <div className="text-[10px] text-emerald-100 font-bold uppercase tracking-wider">Tải trên</div>
                    <div className="text-sm font-extrabold leading-tight">Google Play</div>
                  </div>
                </a>
              </div>
            </div>

            {/* Right Column QR Display Box */}
            <div className="lg:col-span-4 flex justify-center">
              <motion.div
                whileHover={{ scale: 1.05, rotate: 1 }}
                className="bg-white p-6 rounded-3xl text-emerald-950 shadow-xl text-center max-w-[260px] border border-emerald-200/80 relative"
              >
                <div className="w-full aspect-square bg-emerald-50 rounded-2xl overflow-hidden p-2 mb-3 border border-emerald-100 flex items-center justify-center">
                  <img
                    src={qrCodeImg}
                    alt="Quét mã QR tải app Friggy"
                    className="w-full h-full object-contain rounded-xl"
                  />
                </div>
                <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-900">
                  <QrIcon className="w-4 h-4 text-emerald-600" />
                  <span>Quét mã camera để tải ngay</span>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default DownloadCtaBanner;
