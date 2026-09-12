import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * Thin wrapper over react-router's useSearchParams for a single key, so callers
 * don't need to touch URLSearchParams directly. Filters/sort/search all sync to
 * the URL this way, surviving refresh/share and browser back/forward.
 */
export function useQueryParam(key: string, defaultValue: string) {
  const [searchParams, setSearchParams] = useSearchParams();
  const value = searchParams.get(key) ?? defaultValue;

  const set = useCallback(
    (next: string) => {
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev);
          if (next && next !== defaultValue) {
            params.set(key, next);
          } else {
            params.delete(key);
          }
          return params;
        },
        { replace: true },
      );
    },
    [key, defaultValue, setSearchParams],
  );

  return [value, set] as const;
}