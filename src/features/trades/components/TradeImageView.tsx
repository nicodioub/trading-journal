import { X } from "lucide-react";
import type { TradeImage } from "@/domain";
import { CATEGORY_LABELS } from "./ImageDropzone";
import { useResolvedImage } from "./useResolvedImage";

interface TradeImageViewProps {
  image: TradeImage;
  /** When provided, shows a remove button (used in the edit form). */
  onRemove?: () => void;
}

/** Renders a stored trade screenshot with its category caption. */
export function TradeImageView({ image, onRemove }: TradeImageViewProps) {
  const url = useResolvedImage(image.path);

  return (
    <figure className="group overflow-hidden rounded-lg border border-border bg-surface">
      <div className="relative aspect-video bg-background/40">
        {url && (
          <img src={url} alt={image.caption} className="h-full w-full object-cover" />
        )}
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="absolute right-1.5 top-1.5 rounded-md bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <figcaption className="px-3 py-2 text-xs text-muted-foreground">
        {CATEGORY_LABELS[image.category]}
        {image.caption ? ` · ${image.caption}` : ""}
      </figcaption>
    </figure>
  );
}
