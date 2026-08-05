import useSWR, { type SWRConfiguration } from "swr";
import { apiFetch } from "@/lib/api";

/** SWR bound to apiFetch — pass null as the key to skip fetching. */
export function useApi<T>(path: string | null, config?: SWRConfiguration<T>) {
  return useSWR<T>(path, (p: string) => apiFetch<T>(p), config);
}
