import { ScanLine, Bell, UtensilsCrossed } from 'lucide-react';

import screen1Img from '../assets/images/screen_1.png';
import screen2Img from '../assets/images/screen_2.png';
import screen3Img from '../assets/images/screen_3.png';
import screen4Img from '../assets/images/screen_4.png';
import screen5Img from '../assets/images/screen_5.png';
import screen6Img from '../assets/images/screen_6.png';
import heroMockupImg from '../assets/images/hero_mockup.png';
import cuteMascotImg from '../assets/images/cute_mascot.png';
import qrCodeImg from '../assets/images/qr_code.png';

/**
 * ==========================================
 * FRIGGY GUEST LANDING PAGE DATA
 * Chỉnh sửa toàn bộ thông tin hiển thị tại đây
 * ==========================================
 */

// 1. HERO SECTION DATA
export const heroData = {
  badge: 'Tính năng nổi bật mới ra mắt',
  titlePart1: 'Tủ Lạnh Luôn Tươi Ngon,',
  titleHighlight: 'Không Còn Lo Lãng Phí',
  titlePart2: 'Thực Phẩm Cùng Friggy',
  description:
    'Giúp bạn quản lý thực phẩm thông minh, gợi ý món ăn ngon mỗi ngày từ nguyên liệu sẵn có và tiết kiệm đến 30% chi phí ăn uống hàng tháng cho gia đình.',
  appStoreUrl: '#download',
  googlePlayUrl: '#download',
  stats: [
    {
      value: '350.000+',
      label: 'Người Dùng Đăng Ký',
      border: false,
    },
    {
      value: '6.9',
      unit: '★',
      label: 'Sức Khỏe & Phù Hợp',
      border: true,
    },
    {
      value: '98%',
      label: 'Đánh Giá Hài Lòng',
      border: true,
    },
  ],
  floatingBadges: {
    badge1: {
      title: 'Nhắc hạn dùng 24/7',
      subtitle: 'Tươi ngon mỗi ngày',
    },
    badge2: {
      title: 'Friggy AI Chef',
      subtitle: 'Gợi ý 1,000+ món ăn',
    },
  },
  mockupImage: heroMockupImg,
};

// 2. FEATURES CAROUSEL SECTION DATA
export const featureItems = [
  {
    id: 0,
    title: 'Trang Chủ Quản Lý Tủ Lạnh Thông Minh',
    subtitle: 'GIAO DIỆN TỔNG QUAN THỜI GIAN THỰC',
    description:
      'Quan sát nhanh trạng thái tủ lạnh, số lượng nguyên liệu sẵn có và các món sắp hết hạn cần dùng ngay.',
    badge: 'Trang chủ',
    tag: '#TrangChuFriggy',
    image: screen1Img,
  },
  {
    id: 1,
    title: 'Quản Lý Thông Tin Nguyên Liệu Trong Tủ',
    subtitle: 'THEO DÕI TỪNG NGĂN & HẠN SỬ DỤNG',
    description:
      'Kiểm soát chi tiết các loại rau củ, thịt, hải sản theo từng ngăn mát, ngăn đông và tủ khô với bộ đếm ngày hết hạn chính xác.',
    badge: 'Tủ lạnh',
    tag: '#QuanLyTuLanh',
    image: screen2Img,
  },
  {
    id: 2,
    title: 'Cảnh Báo Hạn Dùng & Thông Báo 24/7',
    subtitle: 'THÔNG BÁO PUSH & NHẮC ĐI CHỢ',
    description:
      'Tự động gửi thông báo khi thực phẩm sắp hết hạn, nhắc nhở đi chợ và cập nhật các tin tức từ hệ thống Friggy Premium.',
    badge: 'Thông báo',
    tag: '#ThongBao247',
    image: screen3Img,
  },
  {
    id: 3,
    title: 'Gợi Ý Món Ăn AI Theo Nguyên Liệu',
    subtitle: 'ĐẦU BẾP TRÍ TUỆ NHÂN TẠO 3 GIÂY',
    description:
      'AI tự động bóc tách thực phẩm có sẵn để đề xuất các công thức nấu ăn phù hợp nhất kèm tỷ lệ phần trăm chính xác.',
    badge: 'Độc quyền AI',
    tag: '#AIFriggyChef',
    image: screen4Img,
  },
  {
    id: 4,
    title: 'Đa Dạng Phương Thức Nhập Liệu',
    subtitle: 'NHẬP THỦ CÔNG, OCR & MÃ VẠCH',
    description:
      'Lựa chọn linh hoạt thêm thực phẩm vào tủ qua chụp ảnh AI, quét hóa đơn siêu thị, quét mã vạch hoặc nhập tay.',
    badge: 'Tốc độ',
    tag: '#PhuongThucNhap',
    image: screen5Img,
  },
  {
    id: 5,
    title: 'Trò Chuyện & Chia Sẻ Tủ Lạnh Gia Đình',
    subtitle: 'ĐỒNG BỘ THỜI GIAN THỰC ĐIỆN THOẠI',
    description:
      'Kết nối các thành viên trong gia đình hoặc bạn bè cùng quản lý tủ lạnh chung, nhắn tin và cập nhật món ăn mỗi ngày.',
    badge: 'Đồng bộ',
    tag: '#TinNhanGiaDinh',
    image: screen6Img,
  },
];

// 3. HOW IT WORKS SECTION DATA
export const howItWorksSteps = [
  {
    id: 1,
    stepNumber: '01',
    icon: ScanLine,
    title: 'Quét & Nhập dữ liệu',
    subtitle: 'Tự động bóc tách thông minh',
    description:
      'Chụp nhanh hóa đơn siêu thị hoặc quét mã vạch. Friggy sẽ tự động nhận diện thực phẩm, lưu vị trí (ngăn đông/mát) và hạn dùng.',
    previewTitle: 'Scan Hóa Đơn WinMart',
    previewDetails: [
      'Bắp cải xanh (Hạn dùng: 7 ngày)',
      'Sữa tươi Vinamilk (Hạn dùng: 5 ngày)',
      'Thịt bò nạc (Hạn dùng: 3 ngày - Ngăn đông)',
    ],
    previewBadge: 'AI Auto-Recognized 1s',
  },
  {
    id: 2,
    stepNumber: '02',
    icon: Bell,
    title: 'Nhận nhắc nhở & Gợi ý',
    subtitle: 'Cảnh báo thông minh 24/7',
    description:
      'Ứng dụng tự động thông báo trước 3 ngày khi đồ ăn chuẩn bị hết hạn, đồng thời lập danh sách nguyên liệu cần ưu tiên chế biến ngay.',
    previewTitle: 'Thông Báo Nhắc Hạn Dùng',
    previewDetails: [
      '⚠️ Thịt bò nạc chuẩn bị hết hạn trong 24h',
      '💡 Gợi ý: Nấu món Thịt Bò Xào Bắp Cải hôm nay',
      '🛒 Đã tự lập danh sách mua sắm bổ sung',
    ],
    previewBadge: 'Smart Expiration Notification',
  },
  {
    id: 3,
    stepNumber: '03',
    icon: UtensilsCrossed,
    title: 'Nấu Ngon cùng Friggy AI',
    subtitle: 'Đầu bếp thông minh căn bếp',
    description:
      'Thỏa sức chế biến các món ăn ngon đầy đủ dinh dưỡng từ nguyên liệu sẵn có trong tủ lạnh theo hướng dẫn từng bước chi tiết.',
    previewTitle: 'Công Thức Nấu Ăn Món Gợi Ý',
    previewDetails: [
      '🍳 Món: Thịt Bò Xào Bắp Cải Giòn Ngọt',
      '⏱️ Thời gian: 15 phút - Độ khó: Dễ',
      '🔥 Calo: 350 kcal - Dinh dưỡng tối ưu',
    ],
    previewBadge: 'AI Master Chef Recipe',
  },
];

// 4. PRICING PLANS DATA
export const pricingPlans = [
  {
    id: 'basic',
    name: 'Gói Cơ Bản',
    tag: 'Miễn Phí',
    isPopular: false,
    description: 'Trải nghiệm theo dõi thực phẩm cá nhân đơn giản.',
    priceMonthly: '0đ',
    priceYearly: '0đ',
    period: '/ tháng',
    ctaText: 'Đăng ký miễn phí',
    features: [
      'Quản lý tối đa 30 món thực phẩm',
      'Cảnh báo hạn dùng chuẩn',
      '5 lượt hỏi đáp Friggy AI/tháng',
      'Quét mã barcode sản phẩm',
    ],
  },
  {
    id: 'pro',
    name: 'Friggy Pro',
    tag: 'Khuyên Dùng',
    isPopular: true,
    popularText: 'Được yêu thích nhất cho gia đình',
    description: 'Tối ưu hoàn hảo cho gia đình nhỏ, mở khóa trọn bộ tính năng AI thông minh.',
    priceMonthly: '69.000đ',
    priceYearly: '55.000đ',
    period: '/ tháng',
    ctaText: 'Dùng thử miễn phí 7 ngày',
    features: [
      'Quản lý KHÔNG GIỚI HẠN thực phẩm',
      'AI Friggy Chef gợi ý món ngon không giới hạn',
      'Quét hoá đơn siêu thị & Barcode 1 chạm',
      'Cảnh báo thông minh đa tầng 24/7',
      'Thống kê phân tích chi phí ăn uống/tháng',
    ],
  },
  {
    id: 'family',
    name: 'Friggy Gia Đình',
    tag: 'Gia Đình',
    isPopular: false,
    description: 'Dành cho gia đình nhiều thế hệ hoặc nhà đông người cần quản lý chung.',
    priceMonthly: '129.000đ',
    priceYearly: '99.000đ',
    period: '/ tháng',
    ctaText: 'Nâng cấp gói Gia đình',
    features: [
      'Tất cả quyền lợi của gói Pro',
      'Chia sẻ quản lý cho 5 tài khoản',
      'Quản lý 2 tủ lạnh cùng lúc (đông/mát)',
      'Đồng bộ hoá đi chợ theo thời gian thực',
      'Hỗ trợ ưu tiên kỹ thuật 24/7',
    ],
  },
];

// 5. TESTIMONIALS / REVIEWS DATA
export const testimonialsData = [
  {
    id: 1,
    stars: 5,
    content:
      'Chưa bao giờ tôi quản lý tủ lạnh gọn gàng và dễ dàng đến vậy. Không còn gặp tình trạng mua nhầm đồ trùng, rau củ bị hỏng vì quên. Thích nhất tính năng AI gợi ý món ăn theo nguyên liệu sẵn có!',
    author: 'Chị Mai Anh',
    role: 'Nội trợ gia đình 4 người - TP. Hồ Chí Minh',
    initials: 'MA',
    verified: true,
    tag: 'Tiết kiệm 3.5 triệu/tháng',
    bgGradient: 'from-emerald-500 to-teal-600',
  },
  {
    id: 2,
    stars: 5,
    content:
      'Dân văn phòng bận rộn như mình cực thích Friggy. Sau giờ làm chỉ cần mở app xem có gì trong tủ lạnh là biết nấu món gì nhanh gọn. Tiết kiệm cả triệu bạc tiền đi chợ mỗi tháng!',
    author: 'Anh Minh Tuấn',
    role: 'Kỹ sư phần mềm - Hà Nội',
    initials: 'MT',
    verified: true,
    tag: 'Bận rộn công sở',
    bgGradient: 'from-teal-600 to-emerald-700',
  },
  {
    id: 3,
    stars: 5,
    content:
      'Cả hai vợ chồng mình cùng dùng chung tài khoản Friggy. Chồng đi làm về tạt qua siêu thị mua đúng những món còn thiếu trong danh sách đi chợ trên app. Cực kỳ tiện lợi!',
    author: 'Chị Thu Trang',
    role: 'Marketing Manager - Đà Nẵng',
    initials: 'TT',
    verified: true,
    tag: 'Gia đình trẻ 2 người',
    bgGradient: 'from-green-600 to-emerald-800',
  },
  {
    id: 4,
    stars: 5,
    content:
      'Tính năng scan hoá đơn quá xịn! Đi siêu thị mua cả chục món mà chỉ cần đưa camera chụp 1s là toàn bộ tên thực phẩm và hạn dùng được tự lưu vào ngăn đông/mát chuẩn xác!',
    author: 'Chị Hoàng Yến',
    role: 'Bác sĩ nhi khoa - Cần Thơ',
    initials: 'HY',
    verified: true,
    tag: 'Quét hóa đơn 1s',
    bgGradient: 'from-emerald-600 to-teal-700',
  },
  {
    id: 5,
    stars: 5,
    content:
      'Nhờ Friggy mà vợ chồng tôi không bao giờ lo đồ ăn để quên quá hạn gây ngộ độc cho con nhỏ. App thông báo nhắc nhở 3 ngày trước rất chu đáo và hữu ích.',
    author: 'Anh Bùi Đức',
    role: 'Kinh doanh tự do - Hải Phòng',
    initials: 'BĐ',
    verified: true,
    tag: 'An toàn sức khỏe',
    bgGradient: 'from-teal-500 to-emerald-800',
  },
  {
    id: 6,
    stars: 5,
    content:
      'AI Friggy Chef thực sự ấn tượng! Nhiều hôm đi làm về mệt không biết nấu gì, mở app chọn nguyên liệu là có ngay 3 công thức ngon tuyệt đỉnh như nhà hàng.',
    author: 'Chị Thanh Thủy',
    role: 'Giáo viên mầm non - Nha Trang',
    initials: 'TT',
    verified: true,
    tag: 'Gợi ý món ăn AI',
    bgGradient: 'from-green-500 to-emerald-700',
  },
];

// 6. FAQ SECTION DATA
export const faqsData = [
  {
    id: 1,
    category: 'general',
    question: 'Ứng dụng Friggy có hỗ trợ trên các nền tảng thiết bị nào?',
    answer:
      'Friggy hiện đã hỗ trợ đầy đủ trên cả 2 hệ điều hành phổ biến nhất là iOS (App Store) và Android (Google Play). Bạn cũng có thể truy cập trực tiếp bằng bản Web App trên máy tính bất kỳ lúc nào.',
  },
  {
    id: 2,
    category: 'features',
    question: 'Làm sao để thêm thực phẩm vào app một cách nhanh nhất?',
    answer:
      'Bạn có thể dùng tính năng chụp hóa đơn siêu thị (AI Friggy tự quét và bóc tách từng mặt hàng trong 1 giây) hoặc quét mã vạch Barcode trực tiếp trên bao bì sản phẩm.',
  },
  {
    id: 3,
    category: 'general',
    question: 'Tôi dùng bản Free thì có bị hạn chế nhiều tính năng không?',
    answer:
      'Bản Free hoàn toàn đáp ứng đủ nhu cầu cá nhân với tối đa 30 mặt hàng lưu trữ cùng 5 lượt sử dụng AI Friggy Chat gợi ý món ăn mỗi tháng.',
  },
  {
    id: 4,
    category: 'security',
    question: 'Dữ liệu thực phẩm của gia đình tôi có an toàn bảo mật không?',
    answer:
      'Toàn bộ dữ liệu quản lý gia đình của bạn được mã hóa đồng bộ an toàn và bảo mật 100%. Chỉ các tài khoản được bạn chủ động cấp quyền mới có thể truy cập.',
  },
  {
    id: 5,
    category: 'features',
    question: 'AI Friggy Chat gợi ý món ăn dựa trên nguyên tắc nào?',
    answer:
      'AI phân tích ưu tiên các thực phẩm sắp hết hạn trong tủ lạnh của bạn, kết hợp cùng các công thức chuẩn vị gia đình Việt để tạo ra bữa ăn ngon miệng và giàu dinh dưỡng.',
  },
];

export const faqCategories = [
  { id: 'all', label: 'Tất cả' },
  { id: 'general', label: 'Về ứng dụng' },
  { id: 'features', label: 'Tính năng & AI' },
  { id: 'security', label: 'Bảo mật' },
];

// 7. FOOTER CONTACT & INFORMATION DATA
export const footerData = {
  brandName: 'Friggy',
  slogan:
    'Giải pháp trợ lý tủ lạnh thông minh hàng đầu gia đình Việt. Quản lý hạn dùng, cảnh báo tươi ngon và gợi ý thực đơn chuẩn chef.',
  hotline: '1900 8888 - 0988 123 456',
  hotlineTel: 'tel:19008888',
  email: 'support@friggy.app',
  emailMailto: 'mailto:support@friggy.app',
  workingHours: 'Hỗ trợ 24/7 (Phản hồi trong 5 phút)',
  quickLinks: [
    { label: 'Tính năng ứng dụng', href: '#features' },
    { label: 'Cách hoạt động', href: '#how-it-works' },
    { label: 'Bảng giá dịch vụ', href: '#pricing' },
    { label: 'Câu hỏi thường gặp', href: '#faq' },
    { label: 'Chính sách bảo mật', href: '#privacy' },
  ],
  mascotImage: cuteMascotImg,
  qrCodeImage: qrCodeImg,
};
