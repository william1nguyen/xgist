import React from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/ui/Button";

interface LibraryPaginationProps {
  page: number;
  totalPages: number;
  loading: boolean;
  onPageChange: (page: number) => void;
}

export const LibraryPagination: React.FC<LibraryPaginationProps> = ({
  page,
  totalPages,
  loading,
  onPageChange,
}) => {
  const { t } = useTranslation(["common"]);

  if (totalPages <= 1) return null;

  return (
    <div className="flex justify-center mt-8 space-x-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page === 1 || loading}
      >
        {t("pagination.previous")}
      </Button>

      <span className="px-4 py-2 text-sm text-gray-700">
        {t("pagination.page", { current: page, total: totalPages })}
      </span>

      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages || loading}
      >
        {t("pagination.next")}
      </Button>
    </div>
  );
};
