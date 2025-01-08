import { NextResponse } from "next/server";
import type { Video } from "@/types/video";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const video: Video = {
    id: params.id,
    title: "Giới thiệu về Machine Learning",
    description: `Machine Learning là một lĩnh vực của trí tuệ nhân tạo (AI) và khoa học máy tính...
    
Trong khóa học này, chúng ta sẽ tìm hiểu về:
- Các khái niệm cơ bản về Machine Learning
- Các thuật toán học máy phổ biến
- Ứng dụng thực tế của Machine Learning
- Cách xây dựng mô hình ML đầu tiên`,
    thumbnailUrl: "/api/placeholder/400/225",
    videoUrl: "/path/to/video.mp4",
    likes: 1200,
    comments: 88,
    views: 5000,
    category: "programming",
    createdAt: new Date().toISOString(),
    summary: `Machine Learning (ML) là một nhánh của trí tuệ nhân tạo tập trung vào việc phát triển các hệ thống có khả năng học hỏi từ dữ liệu.

Các khái niệm chính:
1. Supervised Learning (Học có giám sát):
   - Classification (Phân loại)
   - Regression (Hồi quy)

2. Unsupervised Learning (Học không giám sát):
   - Clustering (Phân cụm)
   - Dimensionality Reduction (Giảm chiều dữ liệu)

3. Reinforcement Learning (Học tăng cường):
   - Q-Learning
   - Policy Gradient

Ứng dụng thực tế:
- Nhận dạng hình ảnh
- Xử lý ngôn ngữ tự nhiên
- Dự đoán xu hướng thị trường
- Hệ thống gợi ý

Các bước xây dựng mô hình ML:
1. Thu thập và chuẩn bị dữ liệu
2. Chọn thuật toán phù hợp
3. Huấn luyện mô hình
4. Đánh giá và tinh chỉnh
5. Triển khai mô hình

Lưu ý quan trọng:
- Chất lượng dữ liệu quyết định chất lượng mô hình
- Cần cân nhắc giữa độ chính xác và tốc độ xử lý
- Regularization để tránh overfitting
- Validation để đảm bảo mô hình hoạt động tốt
- Cập nhật mô hình thường xuyên với dữ liệu mới`,
  };

  return NextResponse.json(video);
}
