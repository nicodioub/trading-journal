import { convertFileSrc } from "@tauri-apps/api/core";
import { appLocalDataDir, join } from "@tauri-apps/api/path";
import {
  BaseDirectory,
  exists,
  mkdir,
  remove,
  writeFile,
} from "@tauri-apps/plugin-fs";
import { createId } from "@/lib/utils";
import type { ImageStorage } from "../repositories";

/** Trade screenshots are written as files under <AppLocalData>/images. */
const IMAGES_DIR = "images";

function sanitize(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

/**
 * Local file-backed image storage. Files are stored on disk (keeping the DB
 * light) and served to the webview via Tauri's asset protocol.
 */
export const tauriImageStorage: ImageStorage = {
  async save(fileName, data) {
    await mkdir(IMAGES_DIR, {
      baseDir: BaseDirectory.AppLocalData,
      recursive: true,
    });
    const ref = `${IMAGES_DIR}/${createId()}-${sanitize(fileName)}`;
    await writeFile(ref, data, { baseDir: BaseDirectory.AppLocalData });
    return ref;
  },

  async resolveUrl(ref) {
    const base = await appLocalDataDir();
    const fullPath = await join(base, ref);
    return convertFileSrc(fullPath);
  },

  async delete(ref) {
    const present = await exists(ref, { baseDir: BaseDirectory.AppLocalData });
    if (present) {
      await remove(ref, { baseDir: BaseDirectory.AppLocalData });
    }
  },
};
