import React from 'react';
import { useI18n } from '@/lib/i18n';
import { useOMOState } from '@/hooks/useOMOState';
import { Icon } from '@/components/icon/Icon';
import type { OMOModelAssignment } from '@/lib/omo-state/types';
import { OMOAssignmentList, type OMOAssignmentScope, type OMORosterEntry } from './OMOAssignmentList';

const toRoster = (record: Record<string, OMOModelAssignment> | undefined): OMORosterEntry[] => {
  if (!record) return [];
  return Object.entries(record).map(([name, assignment]) => ({ name, assignment }));
};

export const OMOStatusPanel: React.FC = () => {
  const { t } = useI18n();
  const { config, loading, error, installed, saving, saveAssignments } = useOMOState();

  const handleSaveAssignment = React.useCallback(async (
    scope: OMOAssignmentScope,
    name: string,
    assignment: OMOModelAssignment,
  ) => {
    if (scope === 'agents') {
      await saveAssignments({ agents: { [name]: assignment } });
      return;
    }

    await saveAssignments({ categories: { [name]: assignment } });
  }, [saveAssignments]);

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
        <div className="rounded-xl border border-[var(--status-info-border)] bg-[var(--surface-elevated)] px-3 py-2 text-xs leading-relaxed text-[var(--surface-foreground)]">
          {t('omoStatus.editor.restartNotice')}
        </div>

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
            <OMOAssignmentList entries={agents} saving={saving} scope="agents" onSaveAssignment={handleSaveAssignment} />
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
            <OMOAssignmentList entries={categories} saving={saving} scope="categories" onSaveAssignment={handleSaveAssignment} />
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
