import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

export const useSearch = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState(
    searchParams.get("search") || ""
  );

  useEffect(() => {
    const handler = setTimeout(() => {
      const params = new URLSearchParams(searchParams);
      if (searchTerm) {
        params.set("search", searchTerm);
      } else {
        params.delete("search");
      }
      navigate(`?${params.toString()}`);
    }, 300);

    return () => clearTimeout(handler);
  }, [searchTerm, navigate, searchParams]);

  return { searchTerm, setSearchTerm };
};
