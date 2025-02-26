import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FastForward,
  ChevronLeft,
  PlayCircle,
  FileText,
  Key,
  Upload,
  Clock,
  CheckCircle2,
  ChevronRight,
  Share2,
} from "lucide-react";
import { Layout } from "../components/layout/Layout";
import { Button } from "../components/ui/Button";

export const GuidePage: React.FC = () => {
  const navigate = useNavigate();
  const [activeGuide, setActiveGuide] = useState<number>(1);

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleTrySummarize = () => {
    navigate("/summarize");
  };

  const guides = [
    {
      id: 1,
      title: "Tóm tắt video YouTube",
      icon: <PlayCircle size={40} className="text-indigo-600" />,
      description: "Cách tóm tắt video từ YouTube hoặc các nền tảng video khác",
      steps: [
        "Sao chép URL video từ YouTube, Vimeo hoặc các nền tảng video khác",
        "Dán URL vào ô nhập liệu trên trang tóm tắt",
        "Chọn ngôn ngữ tóm tắt (Tiếng Việt hoặc Tiếng Anh)",
        "Nhấn nút 'Tóm tắt Video' và đợi kết quả được xử lý",
        "Xem tóm tắt video với các điểm chính đã được trích xuất",
      ],
    },
    {
      id: 2,
      title: "Tóm tắt video đã tải lên",
      icon: <Upload size={40} className="text-indigo-600" />,
      description: "Cách tóm tắt file video đã có sẵn trên thiết bị của bạn",
      steps: [
        "Nhấn vào nút 'Tải lên File Video' trên trang tóm tắt",
        "Chọn file video (hỗ trợ định dạng MP4, AVI, MOV, WMV...)",
        "Chọn ngôn ngữ tóm tắt và độ chi tiết mong muốn",
        "Nhấn nút 'Bắt đầu Tóm tắt' và đợi quá trình xử lý hoàn tất",
        "Xem tóm tắt video kèm theo các điểm chính và phân đoạn thời gian",
      ],
    },
    {
      id: 3,
      title: "Sử dụng tính năng nâng cao",
      icon: <Key size={40} className="text-indigo-600" />,
      description:
        "Tùy chỉnh cài đặt nâng cao để có kết quả tóm tắt phù hợp hơn",
      steps: [
        "Mở menu 'Cài đặt nâng cao' trên trang tóm tắt",
        "Điều chỉnh độ dài tóm tắt (ngắn gọn, vừa phải, chi tiết)",
        "Chọn kiểu tóm tắt (tổng quan, tập trung điểm chính, phân tích)",
        "Thêm từ khóa để AI tập trung vào các chủ đề cụ thể",
        "Bật tính năng trích xuất hình ảnh quan trọng từ video (Premium)",
      ],
    },
    {
      id: 4,
      title: "Quản lý và chia sẻ tóm tắt",
      icon: <Share2 size={40} className="text-indigo-600" />,
      description: "Cách lưu trữ, chia sẻ và xuất bản tóm tắt video của bạn",
      steps: [
        "Đăng nhập vào tài khoản VideoSum.AI của bạn",
        "Truy cập trang 'Thư viện của tôi' để xem tất cả tóm tắt đã tạo",
        "Sử dụng nút 'Chia sẻ' để gửi tóm tắt qua email hoặc mạng xã hội",
        "Nhấn 'Tải xuống' để lưu tóm tắt dưới dạng PDF hoặc văn bản",
        "Nhúng tóm tắt vào website hoặc blog của bạn bằng mã nhúng (Premium)",
      ],
    },
  ];

  const GuideNavButton = ({ guide }: { guide: (typeof guides)[0] }) => (
    <button
      className={`flex items-center p-4 rounded-lg transition-all ${
        activeGuide === guide.id
          ? "bg-indigo-50 border-l-4 border-indigo-600"
          : "hover:bg-gray-50 border-l-4 border-transparent"
      }`}
      onClick={() => setActiveGuide(guide.id)}
    >
      <div className="mr-4">{guide.icon}</div>
      <div className="text-left">
        <h3
          className={`font-medium ${activeGuide === guide.id ? "text-indigo-700" : "text-gray-800"}`}
        >
          {guide.title}
        </h3>
        <p className="text-sm text-gray-600">{guide.description}</p>
      </div>
      <ChevronRight
        size={20}
        className={`ml-auto ${activeGuide === guide.id ? "text-indigo-600" : "text-gray-500"}`}
      />
    </button>
  );

  return (
    <Layout activeItem="guide" title="Hướng dẫn sử dụng">
      <div className="max-w-7xl mx-auto px-4">
        <button
          className="flex items-center text-indigo-600 hover:text-indigo-800 mb-4 font-medium"
          onClick={handleGoBack}
        >
          <ChevronLeft size={18} />
          <span className="ml-1">Quay lại</span>
        </button>

        <div className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white rounded-lg p-8 mb-8">
          <div className="max-w-3xl">
            <h1 className="text-3xl font-bold mb-4">
              Hướng dẫn sử dụng VideoSum.AI
            </h1>
            <p className="text-lg mb-6 text-white">
              Tiết kiệm thời gian và nắm bắt nội dung video nhanh chóng với công
              nghệ tóm tắt AI tiên tiến
            </p>
            <div className="flex gap-4">
              <Button
                variant="primary"
                leftIcon={<FastForward size={18} />}
                className="text-indigo-700 hover:bg-gray-50 font-medium"
                onClick={handleTrySummarize}
              >
                Thử ngay
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-1 space-y-4">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">
              Chọn hướng dẫn
            </h2>

            {guides.map((guide) => (
              <GuideNavButton key={guide.id} guide={guide} />
            ))}

            <div className="bg-indigo-50 p-4 rounded-lg mt-6">
              <h3 className="font-medium flex items-center text-indigo-700">
                <Clock size={18} className="mr-2" />
                Tiết kiệm thời gian với VideoSum.AI
              </h3>
              <p className="text-sm text-gray-700 mt-2">
                Người dùng VideoSum.AI tiết kiệm trung bình 90% thời gian xem
                video. Tóm tắt một video 30 phút chỉ mất vài giây.
              </p>
            </div>
          </div>

          <div className="md:col-span-2">
            {guides.map(
              (guide) =>
                guide.id === activeGuide && (
                  <div
                    key={guide.id}
                    className="border border-gray-200 rounded-lg p-6 shadow-sm"
                  >
                    <div className="flex items-center mb-6">
                      {guide.icon}
                      <h2 className="text-2xl font-bold ml-4 text-gray-900">
                        {guide.title}
                      </h2>
                    </div>

                    <p className="text-gray-700 mb-6">{guide.description}</p>

                    <div className="space-y-4 mb-8">
                      {guide.steps.map((step, index) => (
                        <div key={index} className="flex items-start">
                          <div className="bg-indigo-100 text-indigo-800 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-1 font-medium">
                            {index + 1}
                          </div>
                          <p className="ml-3 text-gray-800">{step}</p>
                        </div>
                      ))}
                    </div>

                    <div className="bg-indigo-50 p-4 rounded-lg">
                      <h3 className="font-medium flex items-center text-indigo-700 mb-2">
                        <CheckCircle2 size={18} className="mr-2" />
                        Mẹo hữu ích
                      </h3>
                      <p className="text-sm text-gray-700">
                        {guide.id === 1 &&
                          "Đối với video YouTube, bạn có thể chỉ tập trung tóm tắt một phần cụ thể bằng cách thêm thời gian bắt đầu và kết thúc."}
                        {guide.id === 2 &&
                          "Tùy chỉnh độ chi tiết tóm tắt dựa trên độ dài của video. Video dài hơn 1 giờ nên được tóm tắt ở mức độ 'Tổng quan'."}
                        {guide.id === 3 &&
                          "Sử dụng từ khóa để hướng AI tập trung vào các chủ đề cụ thể quan trọng với bạn trong video."}
                        {guide.id === 4 &&
                          "Xuất tóm tắt sang Google Docs hoặc Notion để dễ dàng tích hợp vào quy trình làm việc hiện tại của bạn."}
                      </p>
                    </div>

                    <div className="mt-8 flex flex-wrap gap-3">
                      {guide.id === 1 && (
                        <Button
                          variant="primary"
                          leftIcon={<PlayCircle size={16} />}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
                          onClick={() => navigate("/summarize?source=youtube")}
                        >
                          Tóm tắt video YouTube
                        </Button>
                      )}
                      {guide.id === 2 && (
                        <Button
                          variant="primary"
                          leftIcon={<Upload size={16} />}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
                          onClick={() => navigate("/summarize?source=upload")}
                        >
                          Tải lên video để tóm tắt
                        </Button>
                      )}
                      {guide.id === 3 && (
                        <Button
                          variant="primary"
                          leftIcon={<Key size={16} />}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
                          onClick={() => navigate("/summarize?advanced=true")}
                        >
                          Khám phá tính năng nâng cao
                        </Button>
                      )}
                      {guide.id === 4 && (
                        <Button
                          variant="primary"
                          leftIcon={<FileText size={16} />}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
                          onClick={() => navigate("/library")}
                        >
                          Đi đến thư viện của tôi
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        leftIcon={
                          guide.id < 4 ? (
                            <ChevronRight size={16} />
                          ) : (
                            <FastForward size={16} />
                          )
                        }
                        className="border-indigo-600 text-indigo-600 hover:bg-indigo-50 font-medium"
                        onClick={() =>
                          setActiveGuide(guide.id < 4 ? guide.id + 1 : 1)
                        }
                      >
                        {guide.id < 4
                          ? "Hướng dẫn tiếp theo"
                          : "Bắt đầu lại từ đầu"}
                      </Button>
                    </div>
                  </div>
                )
            )}

            <div className="mt-8 bg-gray-50 p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold mb-3 text-gray-900">
                Câu hỏi thường gặp
              </h3>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900">
                    1. VideoSum.AI hoạt động với những loại video nào?
                  </h4>
                  <p className="text-sm text-gray-700 mt-1">
                    VideoSum.AI có thể tóm tắt hầu hết các loại video có nội
                    dung nói, bao gồm bài giảng, hội thảo, podcast, tin tức,
                    v.v. Hệ thống hỗ trợ nhiều ngôn ngữ khác nhau.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">
                    2. Tóm tắt video có chính xác không?
                  </h4>
                  <p className="text-sm text-gray-700 mt-1">
                    VideoSum.AI sử dụng công nghệ AI tiên tiến để đảm bảo độ
                    chính xác cao. Tuy nhiên, kết quả tốt nhất đạt được với
                    video có âm thanh rõ ràng và không có nhiều tiếng ồn nền.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">
                    3. Dữ liệu video của tôi có an toàn không?
                  </h4>
                  <p className="text-sm text-gray-700 mt-1">
                    Chúng tôi coi trọng quyền riêng tư của bạn. Video được tải
                    lên chỉ được sử dụng để tạo tóm tắt và sẽ được xóa sau 24
                    giờ, trừ khi bạn chọn lưu vào thư viện cá nhân.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">
                    4. Làm thế nào để có tài khoản Premium?
                  </h4>
                  <p className="text-sm text-gray-700 mt-1">
                    Bạn có thể nâng cấp lên tài khoản Premium từ trang cài đặt
                    tài khoản. Gói Premium cung cấp nhiều tính năng nâng cao và
                    không giới hạn số lượng video tóm tắt.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-indigo-600 text-white py-8 px-6 rounded-lg mt-12 mb-6">
          <div className="max-w-4xl mx-auto">
            <div className="md:flex items-center justify-between">
              <div className="mb-6 md:mb-0">
                <h3 className="text-xl font-bold mb-2">
                  Bắt đầu tóm tắt video đầu tiên của bạn
                </h3>
                <p className="text-white">
                  Tiết kiệm thời gian xem video và nắm bắt thông tin quan trọng
                  nhanh chóng
                </p>
              </div>
              <Button
                variant="outline"
                className="bg-white text-indigo-700 hover:bg-gray-50 border-white font-medium"
                leftIcon={<FastForward size={18} />}
                onClick={handleTrySummarize}
              >
                Tóm tắt video ngay
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};
