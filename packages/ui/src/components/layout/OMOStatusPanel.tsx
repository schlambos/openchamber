import React from 'react';
import { useI18n } from '@/lib/i18n';
import { useOMOState } from '@/hooks/useOMOState';
import { Icon } from '@/components/icon/Icon';
import type { OMOModelAssignment } from '@/lib/omo-state/types';

interface RosterEntry {
  name: string;
  assignment: OMOModelAssignment;
}

const toRoster = (record: Record<string, OMOModelAssignment> | undefined): RosterEntry[] => {
  if (!record) return [];
  return Object.entries(record).map(([name, assignment]) => ({ name, assignment }));
};

const ModelRow: React.FC<{ entry: RosterEntry; isLast: boolean }> = ({ entry, isLast }) => {
  const { name, assignment } = entry;
  const fallbacks = assignment.fallback_models ?? [];
  
  const modelParts = assignment.model.split('/');
  const prefix = modelParts.length > 1 ? modelParts[0] + '/' : '';
  const modelName = modelParts.length > 1 ? modelParts.slice(1).join('/') : assignment.model;

  return (
    <div className={`py-3.5 ${!isLast ? 'border-b border-[var(--surface-subtle)]' : ''}`}>
      <div className="flex flex-col gap-1.5 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-bold text-[var(--primary-base)] break-all">{name}</span>
          {assignment.variant && (
            <span className="rounded bg-[var(--primary-muted)] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--primary-base)] shrink-0">
              {assignment.variant}
            </span>
          )}
        </div>
        <div className="font-mono text-xs leading-tight break-all">
          {prefix && <span className="text-[var(--surface-muted-foreground)] opacity-60">{prefix}</span>}
          <span className="text-[var(--surface-muted-foreground)] opacity-90">{modelName}</span>
        </div>
      </div>
      
      {fallbacks.length > 0 && (
        <details className="mt-2.5 text-xs group cursor-pointer">
          <summary className="font-medium text-[var(--surface-muted-foreground)] hover:text-[var(--surface-foreground)] flex items-center gap-1 leading-none select-none list-none [&::-webkit-details-marker]:hidden">
            <Icon name="arrow-right-s" className="w-3.5 h-3.5 transition-transform group-open:rotate-90" />
            <span>{fallbacks.length} fallback{fallbacks.length > 1 ? 's' : ''}</span>
          </summary>
          <ul className="mt-2 mb-1 ml-[6px] space-y-2.5 border-l-2 border-[var(--surface-subtle)] pl-3">
            {fallbacks.map((fb, i) => {
              const fbParts = fb.model.split('/');
              const fbPrefix = fbParts.length > 1 ? fbParts[0] + '/' : '';
              const fbName = fbParts.length > 1 ? fbParts.slice(1).join('/') : fb.model;
              return (
                <li key={`${fb.model}-${i}`} className="font-mono text-[11px] leading-tight break-all">
                  <div className="text-[var(--surface-muted-foreground)]">
                    {fbPrefix && <span className="opacity-50">{fbPrefix}</span>}
                    <span className="opacity-80">{fbName}</span>
                  </div>
                  {fb.variant && (
                    <div className="mt-1.5">
                      <span className="rounded bg-[var(--surface-subtle)] px-1 py-0.5 text-[9px] font-bold uppercase text-[var(--surface-muted-foreground)]">
                        {fb.variant}
                      </span>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </details>
      )}
    </div>
  );
};

export const OMOStatusPanel: React.FC = () => {
  const { t } = useI18n();
  const { config, loading, error, installed } = useOMOState();

  if (loading && !config) {
    return (
      <div className="flex h-full items-center justify-center bg-[var(--surface-background)]">
        <div className="flex items-center gap-2 text-sm text-[var(--surface-muted-foreground)]">
          <Icon name="loader-4" className="h-4 w-4 animate-spin" />
          <span>{t('common.loading')}</span>
        </div>
      </div>
    );
  }

  if (!installed) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-[var(--surface-background)] p-6 text-center">
        <Icon name="robot-2" className="h-10 w-10 text-[var(--surface-muted-foreground)] opacity-40" />
        <div className="text-sm font-bold text-[var(--surface-foreground)]">
          {t('omoStatus.notInstalled.title')}
        </div>
        <div className="text-xs text-[var(--surface-muted-foreground)] leading-relaxed">
          {t('omoStatus.notInstalled.description')}
        </div>
      </div>
    );
  }

  if (error && !config) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-[var(--surface-background)] p-6 text-center">
        <Icon name="error-warning" className="h-10 w-10 text-[var(--status-error)]" />
        <div className="text-sm font-bold text-[var(--surface-foreground)]">
          {t('omoStatus.error.title')}
        </div>
        <div className="text-xs text-[var(--status-error)] leading-relaxed">{error}</div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-[var(--surface-background)] p-6 text-center">
        <Icon name="robot-2" className="h-10 w-10 text-[var(--surface-muted-foreground)] opacity-40" />
        <div className="text-sm font-medium text-[var(--surface-muted-foreground)]">{t('omoStatus.noConfig')}</div>
      </div>
    );
  }

  const agents = toRoster(config.agents);
  const categories = toRoster(config.categories);
  const teamMode = config.team_mode;

  return (
    <div className="flex h-full flex-col overflow-auto bg-[var(--surface-background)]">
      <div className="flex items-center gap-2 border-b border-[var(--interactive-border)] bg-[var(--surface-elevated)] px-5 py-4">
        <Icon name="robot-2" className="h-5 w-5 text-[var(--surface-foreground)]" />
        <span className="text-sm font-bold tracking-wide text-[var(--surface-foreground)]">OMO</span>
      </div>

      <div className="flex-1 space-y-6 p-4">
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2 px-1">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-[var(--surface-muted-foreground)]">
              {t('omoStatus.section.agents')}
            </h3>
            <span className="rounded-full bg-[var(--surface-muted)] px-2 py-0.5 text-[10px] font-extrabold text-[var(--surface-foreground)]">
              {agents.length}
            </span>
          </div>
          {agents.length > 0 ? (
            <div className="rounded-xl border border-[var(--interactive-border)] bg-[var(--surface-elevated)] px-4 shadow-sm">
              {agents.map((entry, idx) => (
                <ModelRow key={entry.name} entry={entry} isLast={idx === agents.length - 1} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-[var(--interactive-border)] bg-[var(--surface-elevated)] p-4 text-sm text-[var(--surface-muted-foreground)] shadow-sm">
              {t('omoStatus.agents.none')}
            </div>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2 px-1">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-[var(--surface-muted-foreground)]">
              {t('omoStatus.section.categories')}
            </h3>
            <span className="rounded-full bg-[var(--surface-muted)] px-2 py-0.5 text-[10px] font-extrabold text-[var(--surface-foreground)]">
              {categories.length}
            </span>
          </div>
          {categories.length > 0 ? (
            <div className="rounded-xl border border-[var(--interactive-border)] bg-[var(--surface-elevated)] px-4 shadow-sm">
              {categories.map((entry, idx) => (
                <ModelRow key={entry.name} entry={entry} isLast={idx === categories.length - 1} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-[var(--interactive-border)] bg-[var(--surface-elevated)] p-4 text-sm text-[var(--surface-muted-foreground)] shadow-sm">
              {t('omoStatus.categories.none')}
            </div>
          )}
        </section>

        {teamMode && (
          <section className="flex flex-col gap-3">
            <div className="flex items-center gap-2 px-1">
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-[var(--surface-muted-foreground)]">
                {t('omoStatus.section.teamMode')}
              </h3>
            </div>
            <div className="rounded-xl border border-[var(--interactive-border)] bg-[var(--surface-elevated)] p-4 shadow-sm text-sm flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="font-medium text-[var(--surface-muted-foreground)]">{t('omoStatus.teamMode.enabled')}</span>
                <div className="flex items-center gap-2">
                  {teamMode.enabled ? (
                    <>
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--status-success)] opacity-75"></span>
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--status-success)]"></span>
                      </span>
                      <span className="font-bold text-[var(--surface-foreground)]">
                        {t('omoStatus.teamMode.on')}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="h-2 w-2 rounded-full bg-[var(--surface-muted-foreground)] opacity-50"></span>
                      <span className="font-medium text-[var(--surface-muted-foreground)]">
                        {t('omoStatus.teamMode.off')}
                      </span>
                    </>
                  )}
                </div>
              </div>
              
              {typeof teamMode.max_parallel_members === 'number' && (
                <div className="flex items-center justify-between">
                  <span className="font-medium text-[var(--surface-muted-foreground)]">{t('omoStatus.teamMode.maxParallel')}</span>
                  <span className="font-mono text-[var(--surface-foreground)] bg-[var(--surface-muted)] px-2 py-0.5 rounded text-xs font-bold">{teamMode.max_parallel_members}</span>
                </div>
              )}
              {typeof teamMode.max_members === 'number' && (
                <div className="flex items-center justify-between">
                  <span className="font-medium text-[var(--surface-muted-foreground)]">{t('omoStatus.teamMode.maxMembers')}</span>
                  <span className="font-mono text-[var(--surface-foreground)] bg-[var(--surface-muted)] px-2 py-0.5 rounded text-xs font-bold">{teamMode.max_members}</span>
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
