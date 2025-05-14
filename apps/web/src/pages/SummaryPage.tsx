import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { SortOption } from "../types";
import { httpClient } from "../config/httpClient";
import { Tv } from "lucide-react";
import { SearchBar } from "../components/filter/SearchBar";
import { SortingMenu } from "../components/filter/SortingMenu";
import { VideoSkeleton } from "../components/skeleton/VideoSkeleton";
import { EmptyState } from "../components/ui/EmptyState";
import { PresenterCard } from "../components/video/PresentCard";
import { Layout } from "../components/layout/Layout";
import { ViewToggle } from "../components/filter/ViewToggle";
import { Button } from "../components/ui/Button";

interface PresenterItem {
  id: string;
  userId: string;
  videoId: string;
  agentId: string;
  presenterId: string;
  url: string | null;
}

export const SummaryPage: React.FC = () => {
  const { t } = useTranslation(["common", "summary"]);
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [sortBy, setSortBy] = useState("recent");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [presenters, setPresenters] = useState<PresenterItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const sortOptions: SortOption[] = [
    { id: "recent", label: t("summary:sorting.recent") },
    { id: "oldest", label: t("summary:sorting.oldest") },
    { id: "status", label: t("summary:sorting.status") },
  ];

  useEffect(() => {
    fetchPresenters();
  }, [searchQuery]);

  const fetchPresenters = async () => {
    try {
      setLoading(true);
      setError(null);

      const params: Record<string, any> = {
        page: 1,
        size: 20,
      };

      if (searchQuery) {
        params.q = searchQuery;
      }

      const response = await httpClient.get(`/v1/videos/presenters`, {
        params,
      });

      const presentersData = response.data.data;
      setPresenters(presentersData);
    } catch (err) {
      console.error("Error fetching presenters:", err);
      setError(t("summary:errors.fetch_failed"));
    } finally {
      setLoading(false);
    }
  };

  const handleReload = () => {
    fetchPresenters();
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const getSortedData = () => {
    if (sortBy === "recent") {
      return [...presenters].sort((a, b) => b.id.localeCompare(a.id));
    } else if (sortBy === "oldest") {
      return [...presenters].sort((a, b) => a.id.localeCompare(b.id));
    } else if (sortBy === "status") {
      return [...presenters].sort((a, b) => {
        if (!a.url && b.url) return -1;
        if (a.url && !b.url) return 1;
        return 0;
      });
    }
    return presenters;
  };

  const displayData = getSortedData();

  return (
    <Layout activeItem="presenter" title={"Summary"}>
      {error && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4">
          <p>{error}</p>
        </div>
      )}

      <div className="mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="w-full md:w-auto">
          <SearchBar
            placeholder={t("summary:search.placeholder")}
            onSearch={handleSearch}
            fullWidth={true}
          />
        </div>

        <div className="flex items-center space-x-3 w-full md:w-auto">
          <SortingMenu
            options={sortOptions}
            selectedOption={sortBy}
            onSelect={setSortBy}
          />

          <ViewToggle viewMode={viewMode} onViewChange={setViewMode} />

          <Button
            variant="outline"
            size="sm"
            onClick={handleReload}
            disabled={loading}
          >
            {loading
              ? t("summary:buttons.loading")
              : t("summary:buttons.reload")}
          </Button>
        </div>
      </div>

      {loading ? (
        <VideoSkeleton viewMode={viewMode} count={6} />
      ) : displayData.length === 0 ? (
        <EmptyState
          title={t("summary:empty.title")}
          description={t("summary:empty.description")}
          icon={<Tv className="text-gray-400" size={28} />}
        />
      ) : (
        <div
          className={
            viewMode === "grid"
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
              : "space-y-4"
          }
        >
          {displayData.map((item) => (
            <PresenterCard key={item.id} item={item} viewMode={viewMode} />
          ))}
        </div>
      )}
    </Layout>
  );
};
