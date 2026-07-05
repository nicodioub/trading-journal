import { useEffect, useState } from "react";
import { useRepositories } from "@/data";
import type { TradeImage } from "@/domain";
import { CATEGORY_LABELS } from "./ImageDropzone";

/** Resolves a stored image reference to a displayable URL and renders it. */
export function TradeImageView({ image }: { image: TradeImage }) {
  const repos = useRepositories();
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    repos.images
      .resolveUrl(image.path)
      .then((resolved) => {
        if (active) setUrl(resolved);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [image.path, repos.images]);

  return (
    <figure className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="aspect-video bg-background/40">
        {url && (
          <img src={url} alt={image.caption} className="h-full w-full object-cover" />
        )}
      </div>
      <figcaption className="px-3 py-2 text-xs text-muted-foreground">
        {CATEGORY_LABELS[image.category]}
        {image.caption ? ` · ${image.caption}` : ""}
      </figcaption>
    </figure>
  );
}
