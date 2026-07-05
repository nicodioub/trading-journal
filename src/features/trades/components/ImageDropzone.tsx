import { ImagePlus, X } from "lucide-react";
import { useRef } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import type { TradeImageCategory } from "@/domain";
import { createId } from "@/lib/utils";

export interface PendingImage {
  id: string;
  file: File;
  previewUrl: string;
  category: TradeImageCategory;
}

const CATEGORY_LABELS: Record<TradeImageCategory, string> = {
  before: "Before entry",
  during: "During trade",
  after: "After exit",
  htf: "Higher timeframe",
  ltf: "Lower timeframe",
  other: "Other",
};

interface ImageDropzoneProps {
  value: PendingImage[];
  onChange: (images: PendingImage[]) => void;
}

/** Multi-image picker with per-image category and live previews. */
export function ImageDropzone({ value, onChange }: ImageDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const next = [...value];
    for (const file of Array.from(files)) {
      next.push({
        id: createId(),
        file,
        previewUrl: URL.createObjectURL(file),
        category: "other",
      });
    }
    onChange(next);
  };

  const remove = (id: string) => {
    const img = value.find((v) => v.id === id);
    if (img) URL.revokeObjectURL(img.previewUrl);
    onChange(value.filter((v) => v.id !== id));
  };

  const setCategory = (id: string, category: TradeImageCategory) =>
    onChange(value.map((v) => (v.id === id ? { ...v, category } : v)));

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-background/40 py-8 text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
      >
        <ImagePlus className="h-6 w-6" />
        <span className="text-sm font-medium">Click to add screenshots</span>
        <span className="text-xs">Before / during / after, higher & lower timeframe</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {value.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {value.map((img) => (
            <div
              key={img.id}
              className="group overflow-hidden rounded-lg border border-border bg-surface"
            >
              <div className="relative aspect-video">
                <img
                  src={img.previewUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => remove(img.id)}
                  className="absolute right-1.5 top-1.5 rounded-md bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="p-2">
                <Select
                  value={img.category}
                  onValueChange={(v) => setCategory(img.id, v as TradeImageCategory)}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export { CATEGORY_LABELS };
