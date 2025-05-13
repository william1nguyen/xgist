import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { TabItem } from "../types";
import { TabNavigation } from "../components/navigation/TabNavigation";
import { Layout } from "../components/layout/Layout";
import { useLibraryData } from "../hooks/useLibraryData";
import { LibraryTab } from "../types/library";
import { sortMedia } from "../utils/sorters";
import { LibraryControls } from "../components/library/LibraryControls";
import { LibraryContent } from "../components/library/LibraryContent";
import { LibraryPagination } from "../components/library/LibraryPagination";

export const LibraryPage: React.FC = () => {
  const { t } = useTranslation(["library"]);
  const { state, fetchMedia, updateState } = useLibraryData();

  const tabs: TabItem[] = [
    { id: "all", label: t("tabs.all") },
    { id: "video", label: t("tabs.video") },
    { id: "audio", label: t("tabs.audio") },
  ];

  useEffect(() => {
    const filters = {
      searchQuery: state.searchQuery,
      mediaType: state.activeTab,
      page: state.page,
      size: 20,
    };
    fetchMedia(filters);
  }, [state.activeTab, state.page, state.searchQuery, fetchMedia]);

  const handleSearch = (query: string) => {
    updateState({ searchQuery: query, page: 1 });
  };

  const handleTabChange = (tabId: string) => {
    updateState({ activeTab: tabId as LibraryTab, page: 1 });
  };

  const handleReload = () => {
    const filters = {
      searchQuery: state.searchQuery,
      mediaType: state.activeTab,
      page: state.page,
      size: 20,
    };
    fetchMedia(filters);
  };

  const sortedMedia = sortMedia(state.mediaList, state.sortBy);

  const headerContent = (
    <TabNavigation
      tabs={tabs}
      activeTab={state.activeTab}
      onTabChange={handleTabChange}
    />
  );

  return (
    <Layout
      activeItem="library"
      title={t("page_title")}
      headerContent={headerContent}
    >
      <LibraryControls
        viewMode={state.viewMode}
        sortBy={state.sortBy}
        loading={state.loading}
        onSearch={handleSearch}
        onSortChange={(sort) => updateState({ sortBy: sort })}
        onViewChange={(view) => updateState({ viewMode: view })}
        onReload={handleReload}
      />

      <LibraryContent
        mediaList={sortedMedia}
        viewMode={state.viewMode}
        loading={state.loading}
      />

      <LibraryPagination
        page={state.page}
        totalPages={state.totalPages}
        loading={state.loading}
        onPageChange={(page) => updateState({ page })}
      />
    </Layout>
  );
};
