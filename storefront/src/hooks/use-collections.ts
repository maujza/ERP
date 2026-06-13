"use client";

import { useEffect, useState } from "react";

import { sdk } from "@/lib/medusa";

/**
 * A Medusa product collection as consumed by the storefront. Collections are
 * the backend-driven merchandising surface behind the "Colecciones" section,
 * the header navigation, and the catalog filters.
 */
export type StoreCollection = {
  id: string;
  title: string;
  handle: string;
};

type UseCollectionsResult = {
  collections: StoreCollection[];
  loading: boolean;
  error: boolean;
};

/**
 * Fetches product collections from Medusa once on mount. Returns an empty list
 * (never throws) so callers can render gracefully when there are no collections
 * or the backend is unreachable.
 */
export function useCollections(): UseCollectionsResult {
  const [collections, setCollections] = useState<StoreCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    sdk.store.collection
      .list({ limit: 100, fields: "id,title,handle" })
      .then(({ collections: fetched }) => {
        if (cancelled) return;
        setCollections(
          fetched.map((c: { id: string; title?: string | null; handle?: string | null }) => ({
            id: c.id,
            title: c.title ?? "",
            handle: c.handle ?? "",
          })),
        );
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        console.error("[useCollections] Failed to load collections", err);
        setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { collections, loading, error };
}
