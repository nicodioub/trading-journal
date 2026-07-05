import { useEffect, useState } from "react";
import { useRepositories } from "@/data";

/** Resolves a stored image reference to a displayable URL via the active storage adapter. */
export function useResolvedImage(path: string): string | null {
  const repos = useRepositories();
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    repos.images
      .resolveUrl(path)
      .then((resolved) => {
        if (active) setUrl(resolved);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [path, repos.images]);

  return url;
}
