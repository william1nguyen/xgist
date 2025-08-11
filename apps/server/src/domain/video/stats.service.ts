import { and, count, eq, desc, sum, gte } from "drizzle-orm";
import _ from "lodash";
import { db } from "~/drizzle/db";
import { videoCategory, videoTable } from "~/drizzle/schema/video";
import { getCounterValue } from "~/infra/metrics";
import { getOrSetCache } from "~/infra/utils/cache";

export interface CategoryData {
  name: string;
  count: number;
  percentage: number;
}

export interface Activity {
  id: string;
  title: string;
  timestamp: string;
  iconName: string;
  iconColor: string;
}

export interface StatisticsData {
  totalVideos: number;
  totalSummaries: number;
  totalDuration: string;
  totalSavedTime: string;
  uploadedThisMonth: number;
  summarizedThisMonth: number;
}

export const getCategoryStats = async (userId: string) => {
  const categories = videoCategory.enumValues;

  const cacheKey = `stats:categories:${userId}`;
  const ttl = 60; // 1 minute cache
  const categoryCounts = await getOrSetCache(cacheKey, ttl, async () => {
    const counts = await Promise.all(
      categories.map(async (category) => {
        const metricCount = await getCounterValue("video_uploaded_total", {
          userId,
          category,
        });
        if (metricCount > 0) {
          return { name: category, count: metricCount };
        }
        const result = await db
          .select({ count: count() })
          .from(videoTable)
          .where(
            and(
              eq(videoTable.category, category),
              eq(videoTable.userId, userId)
            )
          );
        return { name: category, count: result[0].count };
      })
    );
    return counts;
  });

  const totalVideos = categoryCounts.reduce(
    (sum, category) => sum + category.count,
    0
  );

  const categoryData: CategoryData[] = categoryCounts.map((category) => ({
    name: category.name,
    count: category.count,
    percentage:
      totalVideos > 0 ? Math.round((category.count / totalVideos) * 100) : 0,
  }));

  return categoryData.sort((a, b) => b.count - a.count);
};

export const getUserActivities = async (userId: string) => {
  const recentVideos = await db
    .select({
      id: videoTable.id,
      title: videoTable.title,
      createdTime: videoTable.createdTime,
      updatedTime: videoTable.updatedTime,
      views: videoTable.views,
      isSummarized: videoTable.isSummarized,
    })
    .from(videoTable)
    .where(eq(videoTable.userId, userId))
    .orderBy(desc(videoTable.createdTime))
    .limit(10);

  const activities: Activity[] = recentVideos.map((video) => {
    const isRecent =
      new Date(video.createdTime).getTime() >
      Date.now() - 7 * 24 * 60 * 60 * 1000;
    const timestamp = formatTimestamp(video.createdTime.toISOString());

    if (isRecent && !video.isSummarized) {
      return {
        id: `upload-${video.id}`,
        title: `Đã đăng tải video "${truncateTitle(video.title)}"`,
        timestamp,
        iconName: "Upload",
        iconColor: "indigo",
      };
    } else if (video.isSummarized) {
      return {
        id: `summarize-${video.id}`,
        title: `Đã tóm tắt video "${truncateTitle(video.title)}"`,
        timestamp,
        iconName: "BookOpen",
        iconColor: "green",
      };
    } else if (video.views > 10) {
      return {
        id: `views-${video.id}`,
        title: `Video "${truncateTitle(video.title)}" đạt ${video.views} lượt xem`,
        timestamp,
        iconName: "Eye",
        iconColor: "blue",
      };
    } else {
      return {
        id: `update-${video.id}`,
        title: `Đã cập nhật video "${truncateTitle(video.title)}"`,
        timestamp: video.updatedTime
          ? formatTimestamp(video.updatedTime.toISOString())
          : "N/A",
        iconName: "Edit",
        iconColor: "purple",
      };
    }
  });

  return activities;
};

export const getUserStatistics = async (userId: string) => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalVideosResult,
    totalSummariesResult,
    totalDurationResult,
    uploadedThisMonthResult,
    summarizedThisMonthResult,
  ] = await Promise.all([
    db
      .select({ count: count() })
      .from(videoTable)
      .where(eq(videoTable.userId, userId)),

    db
      .select({ count: count() })
      .from(videoTable)
      .where(
        and(eq(videoTable.userId, userId), eq(videoTable.isSummarized, true))
      ),

    db
      .select({ total: sum(videoTable.duration) })
      .from(videoTable)
      .where(eq(videoTable.userId, userId)),

    db
      .select({ count: count() })
      .from(videoTable)
      .where(
        and(
          eq(videoTable.userId, userId),
          gte(videoTable.createdTime, monthStart)
        )
      ),

    db
      .select({ count: count() })
      .from(videoTable)
      .where(
        and(
          eq(videoTable.userId, userId),
          eq(videoTable.isSummarized, true),
          gte(videoTable.updatedTime, monthStart)
        )
      ),
  ]);

  // totalVideos from metrics if available
  const metricTotalVideos = await getCounterValue("video_uploaded_total", {
    userId,
  } as any);
  const totalVideos = metricTotalVideos > 0 ? metricTotalVideos : totalVideosResult[0].count;
  const totalSummaries = totalSummariesResult[0].count;
  const totalDurationInSeconds = totalDurationResult[0].total || 0;

  const savedTimeInSeconds = totalSummaries
    ? Math.floor(
        (totalDurationInSeconds as number) *
          0.8 *
          (totalSummaries / totalVideos)
      )
    : 0;

  return {
    totalVideos,
    totalSummaries,
    totalDuration: formatDuration(totalDurationInSeconds as number),
    totalSavedTime: formatDuration(savedTimeInSeconds),
    uploadedThisMonth: uploadedThisMonthResult[0].count,
    summarizedThisMonth: summarizedThisMonthResult[0].count,
  };
};

export const truncateTitle = (
  title: string,
  maxLength: number = 40
): string => {
  if (title.length <= maxLength) return title;
  return title.substring(0, maxLength) + "...";
};

export const formatTimestamp = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return "Vài giây trước";
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} phút trước`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} giờ trước`;
  } else if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} ngày trước`;
  } else {
    return `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")}/${date.getFullYear()}`;
  }
};

export const formatDuration = (totalSeconds: number): string => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  return `${hours}h ${minutes}m`;
};
