import React from 'react';
import { runtimeFetch } from '@/lib/runtime-fetch';
import { getRuntimeUrlResolver } from '@/lib/runtime-url';
import type { OMOAssignmentPatch, OMOConfig, OMOConfigResponse } from '@/lib/omo-state/types';

const POLL_INTERVAL = 5000;

interface UseOMOStateResult {
  config: OMOConfig | null;
  loading: boolean;
  error: string | null;
  installed: boolean;
  saving: boolean;
  saveAssignments: (patch: OMOAssignmentPatch) => Promise<OMOConfig>;
}

const mergeConfigPatch = (base: OMOConfig, patch: OMOAssignmentPatch): OMOConfig => ({
  ...base,
  ...(patch.agents ? { agents: { ...(base.agents ?? {}), ...patch.agents } } : {}),
  ...(patch.categories ? { categories: { ...(base.categories ?? {}), ...patch.categories } } : {}),
});

const readErrorText = async (response: Response, fallback: string): Promise<string> => {
  const text = await response.text();
  return text.length > 0 ? text : fallback;
};

export function useOMOState(): UseOMOStateResult {
  const [config, setConfig] = React.useState<OMOConfig | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [installed, setInstalled] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  const fetchConfig = React.useCallback(async () => {
    try {
      const url = getRuntimeUrlResolver().api('/api/omo/state');
      const response = await runtimeFetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data: OMOConfigResponse = await response.json();

      if (!data.installed) {
        setInstalled(false);
        setConfig(null);
        setError(null);
      } else {
        setInstalled(true);
        setConfig((prev: OMOConfig | null) => data.config ?? prev);
        setError(data.error ?? null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  const saveAssignments = React.useCallback(async (patch: OMOAssignmentPatch): Promise<OMOConfig> => {
    if (!config) {
      throw new Error('No OMO config loaded');
    }

    const previousConfig = config;
    const optimisticConfig = mergeConfigPatch(previousConfig, patch);

    setSaving(true);
    setConfig(optimisticConfig);
    setError(null);

    try {
      const response = await runtimeFetch(getRuntimeUrlResolver().api('/api/omo/state'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(patch),
      });

      if (!response.ok) {
        throw new Error(await readErrorText(response, `HTTP ${response.status}`));
      }

      const data: OMOConfigResponse = await response.json();
      if (!data.config) {
        throw new Error(data.error ?? 'Failed to save OMO config');
      }

      setConfig(data.config);
      await fetchConfig();
      return data.config;
    } catch (err) {
      setConfig(previousConfig);
      const message = err instanceof Error ? err.message : 'Failed to save OMO config';
      setError(message);
      throw new Error(message);
    } finally {
      setSaving(false);
    }
  }, [config, fetchConfig]);

  React.useEffect(() => {
    let disposed = false;
    let timer: number | null = null;

    const scheduleNext = (delayMs: number) => {
      if (disposed) return;
      timer = window.setTimeout(async () => {
        if (disposed) return;
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
  }, [fetchConfig]);

  return { config, loading, error, installed, saving, saveAssignments };
}
