import { db } from "../db";
import { videoTable } from "../schema/video";

export type VideoMetadata = {
  transcripts: string[];
  mainIdeas: string[];
  mainKeys: string[];
  summary: string;
};

export const seedVideoData = async () => {
  const videos = [
    {
      id: "d4e5f6a7-b8c9-7d0e-1f2a-3b4c5d6e7f8a",
      url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      title: "Hướng dẫn sử dụng Drizzle ORM với PostgreSQL",
      description:
        "Video hướng dẫn chi tiết cách sử dụng Drizzle ORM để làm việc với cơ sở dữ liệu PostgreSQL trong ứng dụng Node.js.",
      thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
      userId: "a1b2c3d4-e5f6-4a5b-8c9d-1e2f3a4b5c6d",
      category: "technology" as const,
      duration: 1260,
      views: 4587,
      isSummarized: true,
      metadata: {
        transcripts: [
          "Chào mừng các bạn đến với video hướng dẫn về Drizzle ORM. Hôm nay chúng ta sẽ tìm hiểu cách sử dụng Drizzle ORM với PostgreSQL.",
          "Trước tiên, hãy cài đặt các gói cần thiết: npm install drizzle-orm postgres",
        ],
        mainIdeas: [
          "Cài đặt và cấu hình Drizzle ORM",
          "Tạo schema và định nghĩa quan hệ",
          "Thực hiện truy vấn cơ bản",
          "Xử lý migrations",
        ],
        mainKeys: [
          "Drizzle ORM",
          "PostgreSQL",
          "Schema",
          "Migrations",
          "Relationships",
        ],
        summary:
          "Video hướng dẫn cách cài đặt và sử dụng Drizzle ORM với PostgreSQL, bao gồm việc tạo schema, định nghĩa quan hệ và thực hiện các truy vấn.",
      },
      createdTime: new Date("2023-04-05T09:20:00Z"),
      updatedTime: new Date("2023-04-05T09:20:00Z"),
      deletedTime: null,
    },
    {
      id: "e5f6a7b8-c9d0-8e1f-2a3b-4c5d6e7f8a9b",
      url: "https://www.youtube.com/embed/PHe0bXAIuk0",
      title: "10 cách quản lý tài chính cá nhân hiệu quả",
      description:
        "Hướng dẫn các phương pháp quản lý tài chính cá nhân giúp tiết kiệm và đầu tư hiệu quả.",
      thumbnail: "https://img.youtube.com/vi/PHe0bXAIuk0/maxresdefault.jpg",
      userId: "b2c3d4e5-f6a7-5b6c-9d0e-2f3a4b5c6d7e",
      category: "finance" as const,
      duration: 845,
      views: 7823,
      isSummarized: true,
      metadata: {
        transcripts: [
          "Quản lý tài chính cá nhân là một kỹ năng quan trọng mà mọi người nên học. Trong video này, tôi sẽ chia sẻ 10 cách hiệu quả.",
          "Đầu tiên, hãy lập ngân sách chi tiêu hàng tháng và tuân thủ nó.",
        ],
        mainIdeas: [
          "Lập ngân sách chi tiêu",
          "Tiết kiệm tự động",
          "Đầu tư thông minh",
          "Quản lý và giảm nợ",
          "Xây dựng quỹ khẩn cấp",
        ],
        mainKeys: [
          "Tài chính cá nhân",
          "Ngân sách",
          "Tiết kiệm",
          "Đầu tư",
          "Quản lý nợ",
        ],
        summary:
          "Video trình bày 10 phương pháp hiệu quả để quản lý tài chính cá nhân, bao gồm lập ngân sách, tiết kiệm tự động, đầu tư thông minh và giảm nợ.",
      },
      createdTime: new Date("2023-05-12T16:40:00Z"),
      updatedTime: new Date("2023-05-12T16:40:00Z"),
      deletedTime: null,
    },
    {
      id: "f6a7b8c9-d0e1-9f2a-3b4c-5d6e7f8a9b0c",
      url: "https://www.youtube.com/embed/5MgBikgcWnY",
      title: "Bí quyết nâng cao năng suất làm việc tại nhà",
      description:
        "Các mẹo và kỹ thuật giúp tăng năng suất khi làm việc từ xa hoặc tại nhà.",
      thumbnail: "https://img.youtube.com/vi/5MgBikgcWnY/maxresdefault.jpg",
      userId: "c3d4e5f6-a7b8-6c7d-0e1f-3a4b5c6d7e8f",
      category: "productivity" as const,
      duration: 1140,
      views: 3265,
      isSummarized: false,
      metadata: null,
      createdTime: new Date("2023-06-18T11:30:00Z"),
      updatedTime: new Date("2023-06-18T11:30:00Z"),
      deletedTime: null,
    },
    {
      id: "a7b8c9d0-e1f2-3a4b-5c6d-7e8f9a0b1c2d",
      url: "https://www.youtube.com/embed/rJesac0_Ftw",
      title: "Machine Learning cơ bản cho người mới bắt đầu",
      description:
        "Giới thiệu về Machine Learning và các khái niệm cơ bản cho người mới bắt đầu. Video này sẽ giúp bạn hiểu rõ về các thuật toán học máy phổ biến.",
      thumbnail: "https://img.youtube.com/vi/rJesac0_Ftw/maxresdefault.jpg",
      userId: "a1b2c3d4-e5f6-4a5b-8c9d-1e2f3a4b5c6d",
      category: "technology" as const,
      duration: 1850,
      views: 15782,
      isSummarized: true,
      metadata: {
        transcripts: [
          "Machine Learning là một nhánh của trí tuệ nhân tạo cho phép máy tính học từ dữ liệu và đưa ra dự đoán.",
          "Có ba loại học máy chính: học có giám sát, học không giám sát và học tăng cường.",
        ],
        mainIdeas: [
          "Giới thiệu về Machine Learning",
          "Supervised Learning (Học có giám sát)",
          "Unsupervised Learning (Học không giám sát)",
          "Reinforcement Learning (Học tăng cường)",
          "Ứng dụng thực tế",
        ],
        mainKeys: [
          "Machine Learning",
          "AI",
          "Supervised Learning",
          "Unsupervised Learning",
          "Reinforcement Learning",
        ],
        summary:
          "Video giới thiệu về Machine Learning, các phương pháp học máy cơ bản (học có giám sát, học không giám sát, học tăng cường) và các ứng dụng trong thực tế. Phù hợp cho người mới bắt đầu tìm hiểu về lĩnh vực này.",
      },
      createdTime: new Date("2023-07-10T14:25:00Z"),
      updatedTime: new Date("2023-07-10T14:25:00Z"),
      deletedTime: null,
    },
    {
      id: "b8c9d0e1-f2a3-4b5c-6d7e-8f9a0b1c2d3e",
      url: "https://www.youtube.com/embed/Y8Tko2YC5hA",
      title: "Hướng dẫn thiết kế website responsive với CSS Grid và Flexbox",
      description:
        "Tìm hiểu cách sử dụng CSS Grid và Flexbox để thiết kế website đáp ứng trên mọi thiết bị. Video này sẽ giúp bạn làm chủ hai công cụ layout mạnh mẽ nhất của CSS hiện đại.",
      thumbnail: "https://img.youtube.com/vi/Y8Tko2YC5hA/maxresdefault.jpg",
      userId: "b2c3d4e5-f6a7-5b6c-9d0e-2f3a4b5c6d7e",
      category: "technology" as const,
      duration: 2240,
      views: 23456,
      isSummarized: true,
      metadata: {
        transcripts: [
          "CSS Grid và Flexbox là hai công cụ layout mạnh mẽ trong CSS hiện đại.",
          "Grid phù hợp cho layout 2 chiều, trong khi Flexbox tối ưu cho layout 1 chiều.",
        ],
        mainIdeas: [
          "So sánh giữa CSS Grid và Flexbox",
          "Xây dựng layout cơ bản với Grid",
          "Tạo component linh hoạt với Flexbox",
          "Kết hợp Grid và Flexbox",
          "Responsive design với media queries",
        ],
        mainKeys: [
          "CSS Grid",
          "Flexbox",
          "Responsive Design",
          "Web Layout",
          "Media Queries",
        ],
        summary:
          "Video hướng dẫn cách sử dụng CSS Grid và Flexbox để tạo layout website responsive. Giải thích khi nào nên dùng Grid, khi nào nên dùng Flexbox và cách kết hợp cả hai để tạo giao diện tối ưu trên mọi kích thước màn hình.",
      },
      createdTime: new Date("2023-08-22T10:15:00Z"),
      updatedTime: new Date("2023-08-22T10:15:00Z"),
      deletedTime: null,
    },
    {
      id: "c9d0e1f2-a3b4-5c6d-7e8f-9a0b1c2d3e4f",
      url: "https://www.youtube.com/embed/BmvUyHbHVPY",
      title: "ReactJS cơ bản và nâng cao cho frontend developer",
      description:
        "Khóa học ReactJS từ cơ bản đến nâng cao dành cho frontend developer. Tìm hiểu về component, state, props, hooks và các best practices.",
      thumbnail: "https://img.youtube.com/vi/BmvUyHbHVPY/maxresdefault.jpg",
      userId: "c3d4e5f6-a7b8-6c7d-0e1f-3a4b5c6d7e8f",
      category: "technology" as const,
      duration: 3600,
      views: 42789,
      isSummarized: false,
      metadata: null,
      createdTime: new Date("2023-09-05T16:30:00Z"),
      updatedTime: new Date("2023-09-05T16:30:00Z"),
      deletedTime: null,
    },
    {
      id: "d0e1f2a3-b4c5-6d7e-8f9a-0b1c2d3e4f5a",
      url: "https://www.youtube.com/embed/gLeVQGvGF-Y",
      title: "Khám phá Việt Nam: Top 10 địa điểm du lịch đẹp nhất miền Trung",
      description:
        "Khám phá vẻ đẹp của miền Trung Việt Nam qua 10 điểm đến nổi tiếng nhất. Từ phố cổ Hội An đến bãi biển Mỹ Khê, video này sẽ là hướng dẫn hoàn hảo cho chuyến du lịch của bạn.",
      thumbnail: "https://img.youtube.com/vi/gLeVQGvGF-Y/maxresdefault.jpg",
      userId: "a1b2c3d4-e5f6-4a5b-8c9d-1e2f3a4b5c6d",
      category: "travel" as const,
      duration: 1520,
      views: 18965,
      isSummarized: true,
      metadata: {
        transcripts: [
          "Miền Trung Việt Nam là nơi có nhiều di sản văn hóa thế giới và cảnh quan thiên nhiên tuyệt đẹp.",
          "Hội An, Huế, Đà Nẵng là ba điểm đến không thể bỏ qua khi du lịch miền Trung.",
        ],
        mainIdeas: [
          "Phố cổ Hội An và đèn lồng",
          "Kinh đô Huế và các lăng tẩm",
          "Bãi biển Đà Nẵng và Bà Nà Hills",
          "Động Phong Nha-Kẻ Bàng",
          "Ẩm thực đặc trưng miền Trung",
        ],
        mainKeys: [
          "Du lịch Việt Nam",
          "Miền Trung",
          "Hội An",
          "Huế",
          "Đà Nẵng",
          "Phong Nha",
        ],
        summary:
          "Video giới thiệu 10 địa điểm du lịch nổi tiếng nhất ở miền Trung Việt Nam, từ các di sản văn hóa thế giới như phố cổ Hội An, Cố đô Huế đến các điểm đến thiên nhiên như bãi biển Mỹ Khê, Bà Nà Hills và Động Phong Nha. Bao gồm thông tin về cách di chuyển, thời điểm lý tưởng để tham quan và các món ăn đặc sản phải thử.",
      },
      createdTime: new Date("2023-10-15T09:45:00Z"),
      updatedTime: new Date("2023-10-15T09:45:00Z"),
      deletedTime: null,
    },
    {
      id: "e1f2a3b4-c5d6-7e8f-9a0b-1c2d3e4f5a6b",
      url: "https://www.youtube.com/embed/L5Nle1VXYnw",
      title: "7 thói quen để có sức khỏe tốt mỗi ngày",
      description:
        "Những thói quen đơn giản nhưng hiệu quả giúp cải thiện sức khỏe thể chất và tinh thần. Video này chia sẻ các bài tập, chế độ ăn uống và kỹ thuật thư giãn mà bạn có thể áp dụng mỗi ngày.",
      thumbnail: "https://img.youtube.com/vi/L5Nle1VXYnw/maxresdefault.jpg",
      userId: "b2c3d4e5-f6a7-5b6c-9d0e-2f3a4b5c6d7e",
      category: "health" as const,
      duration: 1340,
      views: 31457,
      isSummarized: false,
      metadata: null,
      createdTime: new Date("2023-11-08T13:20:00Z"),
      updatedTime: new Date("2023-11-08T13:20:00Z"),
      deletedTime: null,
    },
  ];

  await db.insert(videoTable).values(videos).onConflictDoNothing();
};
