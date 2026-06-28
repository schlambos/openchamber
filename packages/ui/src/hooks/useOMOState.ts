import React from 'react';
import { runtimeFetch } from '@/lib/runtime-fetch';
import { getRuntimeUrlResolver } from '@/lib/runtime-url';
import type { OMOConfig, OMOConfigResponse } from '@/lib/omo-state/types';

const POLL_INTERVAL = 5000;

interface UseOMOStateResult {
  config: OMOConfig | null;
  loading: boolean;
  error: string | null;
  installed: boolean;
}

export function useOMOState(): UseOMOStateResult {
  const [config, setConfig] = React.useState<OMOConfig | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [installed, setInstalled] = React.useState(true);

  React.useEffect(() => {
    let disposed = false;
    let timer: number | null = null;

    const fetchConfig = async () => {
      try {
        const url = getRuntimeUrlResolver().api('/api/omo/state');
        const response = await runtimeFetch(url);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data: OMOConfigResponse = await response.json();
        if (disposed) return;

        if (!data.installed) {
          setInstalled(false);
          setConfig(null);
          setError(null);
        } else {
          setInstalled(true);
          // Preserve previous config when the server returns null (parse error / transient)
          setConfig((prev: OMOConfig | null) => data.config ?? prev);
          setError(data.error ?? null);
        }
      } catch (err) {
        if (disposed) return;
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        if (!disposed) {
          setLoading(false);
        }
      }
    };

    const scheduleNext = (delayMs: number) => {
      if (disposed) return;
      timer = window.setTimeout(async () => {
        await fetchConfig();
        scheduleNext(POLL_INTERVAL);
      }, delayMs);
    };

    scheduleNext(0);

    return () => {
      disposed = true;
      if (timer !== null) {
        window.clearTimeout(timer);
      }
    };
  }, []);

  return { config, loading, error, installed };
}
