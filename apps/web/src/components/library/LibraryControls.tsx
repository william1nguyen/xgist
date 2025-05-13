import React from "react";
import { useTranslation } from "react-i18next";
import { SearchBar } from "../filter/SearchBar";
import { SortingMenu } from "../filter/SortingMenu";
import { ViewToggle } from "../filter/ViewToggle";
import { Button } from "../ui/Button";
import { SortOption } from "../../types";
import { SortType, ViewMode } from "../../types/library";

interface LibraryControlsProps {
  viewMode: ViewMode;
  sortBy: SortType;
  loading: boolean;
  onSearch: (query: string) => void;
  onSortChange: (sort: SortType) => void;
  onViewChange: (view: ViewMode) => void;
  onReload: () => void;
}

export const LibraryControls: React.FC<LibraryControlsProps> = ({
  viewMode,
  sortBy,
  loading,
  onSearch,
  onSortChange,
  onViewChange,
  onReload,
}) => {
  const { t } = useTranslation(["library"]);

  const sortOptions: SortOption[] = [
    { id: "recent", label: t("sorting.recent") },
    { id: "oldest", label: t("sorting.oldest") },
    { id: "title", label: t("sorting.title") },
    { id: "views", label: t("sorting.views") },
  ];

  return (
    <div className="mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-black">
      <SearchBar
        placeholder={t("search.placeholder")}
        onSearch={onSearch}
        fullWidth={false}
      />

      <div className="flex items-center space-x-3">
        <SortingMenu
          options={sortOptions}
          selectedOption={sortBy}
          onSelect={(id) => onSortChange(id as SortType)}
        />
        <ViewToggle viewMode={viewMode} onViewChange={onViewChange} />
        <Button
          variant="outline"
          size="sm"
          onClick={onReload}
          disabled={loading}
        >
          {loading ? t("buttons.loading") : t("buttons.reload")}
        </Button>
      </div>
    </div>
  );
};
