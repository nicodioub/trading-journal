import { z } from "zod";

/**
 * Shared schema primitives used across every model.
 * Keeping these in one place guarantees consistent validation everywhere.
 */

export const idSchema = z.string().min(1);

/**
 * ISO-8601 timestamp stored as a string. SQLite has no native date type, and
 * a future REST API would serialize dates the same way, so strings keep the
 * local and remote data layers interchangeable.
 */
export const timestampSchema = z.string();

/** 1–10 self-rating scale used by the mental check. */
export const ratingSchema = z.number().int().min(1).max(10);
export type Rating = z.infer<typeof ratingSchema>;

export const directionSchema = z.enum(["long", "short"]);
export type Direction = z.infer<typeof directionSchema>;
