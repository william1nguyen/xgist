import { useState } from "react";
import {
  BookOpen,
  CheckCircle,
  FastForward,
  Brain,
  Zap,
  ChevronRight,
  Play,
  Menu,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export const LandingPage = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-black text-white font-sans">
      <header className="py-4 px-6 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <FastForward className="text-indigo-500" size={24} />
          <span className="text-xl font-bold">VideoSum.AI</span>
        </div>

        <nav className="hidden md:flex items-center space-x-8">
          <a
            href="#features"
            className="hover:text-indigo-400 transition-colors"
          >
            Tính năng
          </a>
          <a
            href="#how-it-works"
            className="hover:text-indigo-400 transition-colors"
          >
            Cách thức
          </a>
          <a
            href="#pricing"
            className="hover:text-indigo-400 transition-colors"
          >
            Giá cả
          </a>
          <a href="#faq" className="hover:text-indigo-400 transition-colors">
            FAQ
          </a>
        </nav>

        <div className="hidden md:flex items-center space-x-4">
          <button
            className="px-4 py-2 rounded-full bg-indigo-600 hover:bg-indigo-700 transition-colors"
            onClick={() => navigate("/explore")}
          >
            Dùng thử miễn phí
          </button>
        </div>

        <button
          className="md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-800 p-4">
          <nav className="flex flex-col space-y-4">
            <a
              href="#features"
              className="hover:text-indigo-400 transition-colors"
            >
              Tính năng
            </a>
            <a
              href="#how-it-works"
              className="hover:text-indigo-400 transition-colors"
            >
              Cách thức
            </a>
            <a
              href="#pricing"
              className="hover:text-indigo-400 transition-colors"
            >
              Giá cả
            </a>
            <a href="#faq" className="hover:text-indigo-400 transition-colors">
              FAQ
            </a>
            <div className="flex flex-col space-y-2 pt-4 border-t border-gray-700">
              <button className="px-4 py-2 rounded-full bg-transparent border border-gray-500 hover:border-white transition-colors">
                Đăng nhập
              </button>
              <button
                className="px-4 py-2 rounded-full bg-indigo-600 hover:bg-indigo-700 transition-colors"
                onClick={() => navigate("/explore")}
              >
                Dùng thử miễn phí
              </button>
            </div>
          </nav>
        </div>
      )}

      <section className="px-6 py-16 md:py-24 max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div>
            <div className="inline-block px-3 py-1 rounded-full bg-indigo-900 text-indigo-300 text-sm font-medium mb-4">
              AI-Powered Video Summarization
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Tiết kiệm thời gian xem video với AI tóm tắt thông minh
            </h1>
            <p className="text-gray-300 text-lg mb-8">
              VideoSum.AI sử dụng trí tuệ nhân tạo tiên tiến để tóm tắt bất kỳ
              video nào thành những điểm chính, giúp bạn nắm bắt thông tin nhanh
              chóng mà không bỏ lỡ chi tiết quan trọng.
            </p>

            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
              <button
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 transition-colors rounded-full font-medium flex items-center justify-center"
                onClick={() => navigate("/summarize")}
              >
                <Zap className="mr-2" size={20} />
                Tóm tắt ngay
              </button>
              <button className="px-6 py-3 bg-gray-800 hover:bg-gray-700 transition-colors rounded-full font-medium flex items-center justify-center">
                <Play className="mr-2" size={20} />
                Xem demo
              </button>
            </div>
          </div>

          <div className="relative">
            <div className="bg-gradient-to-tr from-violet-600 to-indigo-500 rounded-lg shadow-2xl aspect-video flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-black bg-opacity-40">
                <FastForward size={48} className="mb-4" />
                <div className="font-bold text-xl mb-2">
                  Video thời lượng 30 phút
                </div>
                <div className="h-2 w-full bg-gray-700 rounded-full mb-4">
                  <div className="h-2 bg-indigo-500 rounded-full w-3/4"></div>
                </div>
                <div className="text-4xl font-bold">→</div>
                <div className="font-bold text-xl mt-2 mb-2">
                  Tóm tắt 3 phút
                </div>
                <div className="h-2 w-full bg-gray-700 rounded-full">
                  <div className="h-2 bg-indigo-500 rounded-full w-1/4"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="py-16 px-6 bg-slate-900">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Tiết kiệm thời gian với VideoSum.AI
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Sử dụng công nghệ AI tiên tiến để biến video dài thành nội dung
              ngắn gọn, dễ tiêu thụ
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-slate-800 rounded-xl p-6">
              <div className="bg-indigo-600 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                <FastForward size={24} />
              </div>
              <h3 className="text-xl font-bold mb-2">Tóm tắt trong vài giây</h3>
              <p className="text-gray-300">
                Tóm tắt bất kỳ video nào bất kể độ dài, nhận các điểm chính và
                thông tin thiết yếu tức thì.
              </p>
            </div>

            <div className="bg-slate-800 rounded-xl p-6">
              <div className="bg-indigo-600 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                <Brain size={24} />
              </div>
              <h3 className="text-xl font-bold mb-2">AI hiểu ngữ cảnh</h3>
              <p className="text-gray-300">
                Công nghệ AI của chúng tôi hiểu ngữ cảnh, chủ đề, và nhận diện
                thông tin quan trọng chính xác.
              </p>
            </div>

            <div className="bg-slate-800 rounded-xl p-6">
              <div className="bg-indigo-600 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                <BookOpen size={24} />
              </div>
              <h3 className="text-xl font-bold mb-2">Điểm chính & ghi chú</h3>
              <p className="text-gray-300">
                Nhận các điểm chính được cấu trúc, từ khóa quan trọng, và ghi
                chú chi tiết tùy chỉnh theo nhu cầu.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Cách thức hoạt động
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Quy trình đơn giản, kết quả mạnh mẽ
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="relative">
              <div className="absolute left-0 top-0 -mt-2 -ml-2 bg-indigo-600 w-8 h-8 rounded-full flex items-center justify-center font-bold">
                1
              </div>
              <div className="bg-slate-800 rounded-xl p-6 pl-8">
                <h3 className="text-xl font-bold mb-3">Dán liên kết video</h3>
                <p className="text-gray-300">
                  Chỉ cần dán URL từ YouTube, Vimeo, hoặc tải lên video của bạn.
                </p>
              </div>
            </div>

            <div className="relative">
              <div className="absolute left-0 top-0 -mt-2 -ml-2 bg-indigo-600 w-8 h-8 rounded-full flex items-center justify-center font-bold">
                2
              </div>
              <div className="bg-slate-800 rounded-xl p-6 pl-8">
                <h3 className="text-xl font-bold mb-3">AI xử lý video</h3>
                <p className="text-gray-300">
                  Thuật toán AI của chúng tôi phân tích âm thanh, hình ảnh và
                  ngữ cảnh.
                </p>
              </div>
            </div>

            <div className="relative">
              <div className="absolute left-0 top-0 -mt-2 -ml-2 bg-indigo-600 w-8 h-8 rounded-full flex items-center justify-center font-bold">
                3
              </div>
              <div className="bg-slate-800 rounded-xl p-6 pl-8">
                <h3 className="text-xl font-bold mb-3">Nhận tóm tắt</h3>
                <p className="text-gray-300">
                  Nhận tóm tắt ngắn gọn, các điểm chính và điểm nhấn trong vài
                  giây.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-16 text-center">
            <button
              className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 transition-colors rounded-full font-bold inline-flex items-center"
              onClick={() => navigate("/summarize")}
            >
              Bắt đầu ngay <ChevronRight size={20} className="ml-2" />
            </button>
          </div>
        </div>
      </section>

      <section className="py-16 px-6 bg-gradient-to-r from-indigo-900 to-violet-900">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-indigo-500 bg-opacity-20 p-8 rounded-2xl">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Tiết kiệm 90% thời gian xem video
            </h2>
            <p className="text-xl mb-8">
              Đừng lãng phí thời gian quý báu của bạn. VideoSum.AI có thể giúp
              bạn tiếp thu kiến thức nhanh hơn 10 lần.
            </p>
            <button
              className="px-8 py-3 bg-white text-indigo-800 hover:bg-gray-100 transition-colors rounded-full font-bold"
              onClick={() => navigate("/explore")}
            >
              Dùng thử miễn phí
            </button>
          </div>
        </div>
      </section>

      <section id="pricing" className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Gói dịch vụ đơn giản
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Lựa chọn gói phù hợp với nhu cầu của bạn
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-slate-800 rounded-xl p-6 border border-transparent hover:border-indigo-500 transition-colors">
              <div className="text-xl font-bold mb-2">Cá nhân</div>
              <div className="text-4xl font-bold mb-1">199k₫</div>
              <div className="text-gray-400 mb-6">mỗi tháng</div>

              <ul className="space-y-3 mb-8">
                <li className="flex items-start">
                  <CheckCircle
                    size={20}
                    className="text-indigo-400 mr-2 mt-1 flex-shrink-0"
                  />
                  <span>10 giờ video mỗi tháng</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle
                    size={20}
                    className="text-indigo-400 mr-2 mt-1 flex-shrink-0"
                  />
                  <span>Tóm tắt văn bản</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle
                    size={20}
                    className="text-indigo-400 mr-2 mt-1 flex-shrink-0"
                  />
                  <span>Trích xuất điểm chính</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle
                    size={20}
                    className="text-indigo-400 mr-2 mt-1 flex-shrink-0"
                  />
                  <span>Hỗ trợ email</span>
                </li>
              </ul>

              <button className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors font-medium">
                Chọn gói này
              </button>
            </div>

            <div className="bg-slate-800 rounded-xl p-6 border-2 border-indigo-500 relative transform md:scale-105 z-10 shadow-xl">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-indigo-600 text-sm font-bold px-4 py-1 rounded-full">
                Phổ biến nhất
              </div>
              <div className="text-xl font-bold mb-2">Chuyên nghiệp</div>
              <div className="text-4xl font-bold mb-1">499k₫</div>
              <div className="text-gray-400 mb-6">mỗi tháng</div>

              <ul className="space-y-3 mb-8">
                <li className="flex items-start">
                  <CheckCircle
                    size={20}
                    className="text-indigo-400 mr-2 mt-1 flex-shrink-0"
                  />
                  <span>30 giờ video mỗi tháng</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle
                    size={20}
                    className="text-indigo-400 mr-2 mt-1 flex-shrink-0"
                  />
                  <span>Tóm tắt văn bản & âm thanh</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle
                    size={20}
                    className="text-indigo-400 mr-2 mt-1 flex-shrink-0"
                  />
                  <span>Trích xuất từ khóa & chủ đề</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle
                    size={20}
                    className="text-indigo-400 mr-2 mt-1 flex-shrink-0"
                  />
                  <span>Hỗ trợ ưu tiên 24/7</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle
                    size={20}
                    className="text-indigo-400 mr-2 mt-1 flex-shrink-0"
                  />
                  <span>Xuất tệp PDF</span>
                </li>
              </ul>

              <button className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors font-medium">
                Chọn gói này
              </button>
            </div>

            <div className="bg-slate-800 rounded-xl p-6 border border-transparent hover:border-indigo-500 transition-colors">
              <div className="text-xl font-bold mb-2">Doanh nghiệp</div>
              <div className="text-4xl font-bold mb-1">Liên hệ</div>
              <div className="text-gray-400 mb-6">giải pháp tùy chỉnh</div>

              <ul className="space-y-3 mb-8">
                <li className="flex items-start">
                  <CheckCircle
                    size={20}
                    className="text-indigo-400 mr-2 mt-1 flex-shrink-0"
                  />
                  <span>Không giới hạn video</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle
                    size={20}
                    className="text-indigo-400 mr-2 mt-1 flex-shrink-0"
                  />
                  <span>Tích hợp API đầy đủ</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle
                    size={20}
                    className="text-indigo-400 mr-2 mt-1 flex-shrink-0"
                  />
                  <span>Phân tích & báo cáo nâng cao</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle
                    size={20}
                    className="text-indigo-400 mr-2 mt-1 flex-shrink-0"
                  />
                  <span>Quản lý người dùng</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle
                    size={20}
                    className="text-indigo-400 mr-2 mt-1 flex-shrink-0"
                  />
                  <span>Tùy chỉnh thương hiệu</span>
                </li>
              </ul>

              <button className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors font-medium">
                Liên hệ với chúng tôi
              </button>
            </div>
          </div>
        </div>
      </section>

      <section id="faq" className="py-16 px-6 bg-slate-900">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold mb-12 text-center">
            Câu hỏi thường gặp
          </h2>

          <div className="space-y-6">
            <div className="bg-slate-800 rounded-xl p-6">
              <h3 className="text-xl font-bold mb-3">
                VideoSum.AI hoạt động với các video nào?
              </h3>
              <p className="text-gray-300">
                Chúng tôi hỗ trợ hầu hết các nền tảng video phổ biến như
                YouTube, Vimeo, Facebook, và nhiều nền tảng khác. Bạn cũng có
                thể tải lên video của riêng mình với nhiều định dạng phổ biến.
              </p>
            </div>

            <div className="bg-slate-800 rounded-xl p-6">
              <h3 className="text-xl font-bold mb-3">
                Tóm tắt có chính xác không?
              </h3>
              <p className="text-gray-300">
                Thuật toán AI của chúng tôi đã được huấn luyện trên hàng triệu
                video để đảm bảo độ chính xác cao. Tuy nhiên, chất lượng tóm tắt
                có thể phụ thuộc vào chất lượng âm thanh và độ phức tạp của nội
                dung.
              </p>
            </div>

            <div className="bg-slate-800 rounded-xl p-6">
              <h3 className="text-xl font-bold mb-3">
                Hỗ trợ những ngôn ngữ nào?
              </h3>
              <p className="text-gray-300">
                Hiện tại, chúng tôi hỗ trợ tiếng Việt, tiếng Anh và hơn 20 ngôn
                ngữ phổ biến khác. Chúng tôi liên tục mở rộng khả năng hỗ trợ
                ngôn ngữ của mình.
              </p>
            </div>

            <div className="bg-slate-800 rounded-xl p-6">
              <h3 className="text-xl font-bold mb-3">
                Dữ liệu của tôi có an toàn không?
              </h3>
              <p className="text-gray-300">
                Chúng tôi coi trọng quyền riêng tư của bạn. Tất cả video và tóm
                tắt đều được mã hóa và chỉ bạn mới có quyền truy cập. Chúng tôi
                không lưu trữ nội dung video của bạn lâu hơn mức cần thiết để
                tạo tóm tắt.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-r from-indigo-900 to-violet-900 py-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Bắt đầu tóm tắt video của bạn ngay hôm nay
          </h2>
          <p className="text-xl mb-8">
            Tiết kiệm thời gian và tăng hiệu suất với công nghệ AI tóm tắt video
            hàng đầu
          </p>
          <button className="bg-white text-indigo-800 hover:bg-gray-100 transition-colors px-8 py-3 rounded-full font-bold">
            Đăng ký dùng thử miễn phí
          </button>
        </div>
      </section>

      <footer className="bg-slate-900 py-8 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center mb-8">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <FastForward className="text-indigo-500" size={20} />
              <span className="text-lg font-bold">VideoSum.AI</span>
            </div>

            <div className="flex flex-wrap justify-center gap-4 md:gap-6">
              <a href="#" className="hover:text-indigo-400 transition-colors">
                Điều khoản
              </a>
              <a href="#" className="hover:text-indigo-400 transition-colors">
                Chính sách riêng tư
              </a>
              <a href="#" className="hover:text-indigo-400 transition-colors">
                Trợ giúp
              </a>
              <a href="#" className="hover:text-indigo-400 transition-colors">
                Liên hệ
              </a>
            </div>
          </div>

          <div className="text-center text-gray-400 text-sm">
            &copy; {new Date().getFullYear()} VideoSum.AI. Bản quyền thuộc về
            VideoSum.AI.
          </div>
        </div>
      </footer>
    </div>
  );
};
