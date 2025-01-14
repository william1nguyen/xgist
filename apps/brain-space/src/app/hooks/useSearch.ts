import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function useSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchTerm) {
        const params = new URLSearchParams(searchParams);
        params.set("search", searchTerm);
        router.push(`/?${params.toString()}`);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [searchTerm, router, searchParams]);

  return { searchTerm, setSearchTerm };
}
