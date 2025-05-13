import { useState, useCallback } from "react";
import { LibraryFilters, LibraryState } from "../types/library";
import { httpClient } from "../config/httpClient";

const initialState: LibraryState = {
  activeTab: "all",
  viewMode: "list",
  sortBy: "recent",
  loading: false,
  searchQuery: "",
  mediaList: [],
  error: null,
  page: 1,
  totalPages: 1,
};

export const useLibraryData = () => {
  const [state, setState] = useState<LibraryState>(initialState);

  const fetchMedia = useCallback(
    async (filters: LibraryFilters) => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const params: any = {
          page: filters.page,
          size: filters.size,
        };

        if (state.searchQuery) {
          params.keyword = state.searchQuery;
        }

        if (filters.mediaType && filters.mediaType !== "all") {
          params.type = filters.mediaType;
        }

        const response = await httpClient.get("/v1/media/me", { params });

        setState((prev) => ({
          ...prev,
          mediaList: response.data.data || [],
          totalPages: response.data.meta?.totalPages || 1,
          loading: false,
        }));
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error: "Failed to fetch media",
          loading: false,
        }));
      }
    },
    [state.searchQuery]
  );

  const updateState = useCallback((updates: Partial<LibraryState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  return { state, fetchMedia, updateState };
};
