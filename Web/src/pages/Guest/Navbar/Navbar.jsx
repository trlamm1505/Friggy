import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, LogIn, Menu, X, ShieldCheck } from 'lucide-react';
import cuteMascotImg from '../../../assets/images/cute_mascot.png';

export const Navbar = ({ onOpenAuthModal, onOpenAdmin }) => {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = (e, sectionId) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    const element = document.getElementById(sectionId);
    if (element) {
      const navbarOffset = 80;
      const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
      const offsetPosition = elementPosition - navbarOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-emerald-100/90 py-3'
          : 'bg-emerald-50/80 backdrop-blur-sm py-4'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Logo with Cute Mascot & "Fri" (Dark) + "ggy" (Green) + Green Dot */}
        <a href="#" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="flex items-center gap-3 group">
          <div className="w-11 h-11 rounded-2xl overflow-hidden bg-gradient-to-tr from-emerald-500 to-green-400 p-0.5 shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform flex items-center justify-center">
            <img
              src={cuteMascotImg}
              alt="Friggy Mascot Logo"
              className="w-full h-full object-cover rounded-xl bg-white"
            />
          </div>
          <div className="flex items-baseline">
            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#19221C]">
              Fri
            </span>
            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#4CAF50]">
              ggy
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-[#4CAF50] inline-block ml-1 shadow-xs"></span>
          </div>
        </a>

        {/* Navigation links with smooth scroll */}
        <nav className="hidden md:flex items-center gap-8">
          <a
            href="#features"
            onClick={(e) => handleNavClick(e, 'features')}
            className="text-sm font-bold tracking-wide text-emerald-900/75 hover:text-emerald-600 transition-colors uppercase cursor-pointer"
          >
            TÍNH NĂNG
          </a>
          <a
            href="#how-it-works"
            onClick={(e) => handleNavClick(e, 'how-it-works')}
            className="text-sm font-bold tracking-wide text-emerald-900/75 hover:text-emerald-600 transition-colors uppercase cursor-pointer"
          >
            CÁCH HOẠT ĐỘNG
          </a>
          <a
            href="#pricing"
            onClick={(e) => handleNavClick(e, 'pricing')}
            className="text-sm font-bold tracking-wide text-emerald-900/75 hover:text-emerald-600 transition-colors uppercase cursor-pointer"
          >
            BẢNG GIÁ
          </a>
          <a
            href="#reviews"
            onClick={(e) => handleNavClick(e, 'reviews')}
            className="text-sm font-bold tracking-wide text-emerald-900/75 hover:text-emerald-600 transition-colors uppercase cursor-pointer"
          >
            ĐÁNH GIÁ
          </a>
          <a
            href="#faq"
            onClick={(e) => handleNavClick(e, 'faq')}
            className="text-sm font-bold tracking-wide text-emerald-900/75 hover:text-emerald-600 transition-colors uppercase cursor-pointer"
          >
            FAQ
          </a>
        </nav>

        {/* Actions */}
        <div className="hidden md:flex items-center gap-4">
          <button
            onClick={() => navigate('/login')}
            className="flex items-center gap-1.5 text-sm font-bold text-emerald-900 hover:text-emerald-600 px-3 py-2 transition-colors cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            Đăng nhập
          </button>
          <a
            href="#download"
            onClick={(e) => handleNavClick(e, 'download')}
            className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white text-sm font-bold px-5 py-2.5 rounded-full shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:-translate-y-0.5 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Tải Ứng Dụng
          </a>
        </div>

        {/* Mobile menu toggle */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-emerald-900 hover:text-emerald-600 focus:outline-none"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-emerald-100 px-4 pt-3 pb-6 space-y-3 animate-fadeIn">
          <a
            href="#features"
            onClick={(e) => handleNavClick(e, 'features')}
            className="block text-base font-semibold text-emerald-900 hover:text-emerald-600 py-1.5 uppercase cursor-pointer"
          >
            TÍNH NĂNG
          </a>
          <a
            href="#how-it-works"
            onClick={(e) => handleNavClick(e, 'how-it-works')}
            className="block text-base font-semibold text-emerald-900 hover:text-emerald-600 py-1.5 uppercase cursor-pointer"
          >
            CÁCH HOẠT ĐỘNG
          </a>
          <a
            href="#pricing"
            onClick={(e) => handleNavClick(e, 'pricing')}
            className="block text-base font-semibold text-emerald-900 hover:text-emerald-600 py-1.5 uppercase cursor-pointer"
          >
            BẢNG GIÁ
          </a>
          <a
            href="#reviews"
            onClick={(e) => handleNavClick(e, 'reviews')}
            className="block text-base font-semibold text-emerald-900 hover:text-emerald-600 py-1.5 uppercase cursor-pointer"
          >
            ĐÁNH GIÁ
          </a>
          <a
            href="#faq"
            onClick={(e) => handleNavClick(e, 'faq')}
            className="block text-base font-semibold text-emerald-900 hover:text-emerald-600 py-1.5 uppercase cursor-pointer"
          >
            FAQ
          </a>
          <div className="pt-2 border-t border-emerald-100 flex flex-col gap-2">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                navigate('/login');
              }}
              className="w-full flex justify-center items-center gap-1.5 text-base font-bold text-emerald-900 py-2 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              Đăng nhập
            </button>
            <a
              href="#download"
              onClick={(e) => handleNavClick(e, 'download')}
              className="w-full flex justify-center items-center gap-2 bg-emerald-600 text-white font-bold py-2.5 rounded-full cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Tải Ứng Dụng
            </a>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
