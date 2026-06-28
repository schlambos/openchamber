import React from 'react';
import { Icon } from '@/components/icon/Icon';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { parseModelIdentifier } from '@/lib/modelIdentifier';
import type { OMOFallbackModel, OMOModelAssignment } from '@/lib/omo-state/types';
import { OMOAssignmentFields, OMOAssignmentFieldShell } from './OMOAssignmentFields';

export type OMOAssignmentScope = 'agents' | 'categories';

export interface OMORosterEntry {
  name: string;
  assignment: OMOModelAssignment;
}

interface OMOAssignmentListProps {
  entries: OMORosterEntry[];
  saving: boolean;
  scope: OMOAssignmentScope;
  onSaveAssignment: (scope: OMOAssignmentScope, name: string, assignment: OMOModelAssignment) => Promise<void>;
}

const splitModelName = (model: string): { prefix: string; name: string } => {
  const modelParts = model.split('/');
  return modelParts.length > 1
    ? { prefix: `${modelParts[0]}/`, name: modelParts.slice(1).join('/') }
    : { prefix: '', name: model };
};

const getFallbacks = (assignment: OMOModelAssignment): OMOFallbackModel[] => assignment.fallback_models ?? [];

const createEmptyFallback = (): OMOFallbackModel => ({ model: '' });

const toSavedAssignment = (draft: OMOModelAssignment): OMOModelAssignment => ({
  model: draft.model.trim(),
  ...(draft.variant?.trim() ? { variant: draft.variant.trim() } : {}),
  ...(getFallbacks(draft).length > 0
    ? {
      fallback_models: getFallbacks(draft).map((fallback) => ({
        model: fallback.model.trim(),
        ...(fallback.variant?.trim() ? { variant: fallback.variant.trim() } : {}),
      })),
    }
    : {}),
});

const ModelSummary: React.FC<{ assignment: OMOModelAssignment }> = ({ assignment }) => {
  const { t } = useI18n();
  const fallbacks = getFallbacks(assignment);
  const { prefix, name } = splitModelName(assignment.model);

  return (
    <div className="min-w-0 space-y-1.5">
      <div className="font-mono text-xs leading-tight break-all">
        {prefix && <span className="text-[var(--surface-muted-foreground)] opacity-60">{prefix}</span>}
        <span className="text-[var(--surface-muted-foreground)] opacity-90">{name}</span>
      </div>
      {fallbacks.length > 0 && (
        <div className="typography-meta text-[var(--surface-muted-foreground)]">
          {fallbacks.length === 1
            ? t('omoStatus.fallbacks.countSingle', { count: fallbacks.length })
            : t('omoStatus.fallbacks.countPlural', { count: fallbacks.length })}
        </div>
      )}
    </div>
  );
};

const OMOAssignmentRow: React.FC<{
  entry: OMORosterEntry;
  isLast: boolean;
  saving: boolean;
  scope: OMOAssignmentScope;
  onSaveAssignment: OMOAssignmentListProps['onSaveAssignment'];
}> = ({ entry, isLast, saving, scope, onSaveAssignment }) => {
  const { t } = useI18n();
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState<OMOModelAssignment>(entry.assignment);

  React.useEffect(() => {
    if (!editing) setDraft(entry.assignment);
  }, [editing, entry.assignment]);

  const setFallback = React.useCallback((index: number, fallback: OMOFallbackModel) => {
    setDraft((current) => ({
      ...current,
      fallback_models: getFallbacks(current).map((candidate, candidateIndex) => (
        candidateIndex === index ? fallback : candidate
      )),
    }));
  }, []);

  const removeFallback = React.useCallback((index: number) => {
    setDraft((current) => ({
      ...current,
      fallback_models: getFallbacks(current).filter((_fallback, candidateIndex) => candidateIndex !== index),
    }));
  }, []);

  const moveFallback = React.useCallback((index: number, direction: -1 | 1) => {
    setDraft((current) => {
      const fallbacks = [...getFallbacks(current)];
      const nextIndex = index + direction;
      const currentFallback = fallbacks[index];
      const nextFallback = fallbacks[nextIndex];
      if (!currentFallback || !nextFallback) return current;
      fallbacks[index] = nextFallback;
      fallbacks[nextIndex] = currentFallback;
      return { ...current, fallback_models: fallbacks };
    });
  }, []);

  const addFallback = React.useCallback(() => {
    setDraft((current) => ({
      ...current,
      fallback_models: [...getFallbacks(current), createEmptyFallback()],
    }));
  }, []);

  const cancelEditing = React.useCallback(() => {
    setDraft(entry.assignment);
    setEditing(false);
  }, [entry.assignment]);

  const save = React.useCallback(async () => {
    const savedAssignment = toSavedAssignment(draft);
    if (!parseModelIdentifier(savedAssignment.model)) {
      toast.error(t('omoStatus.editor.validation.modelRequired'));
      return;
    }

    for (const fallback of savedAssignment.fallback_models ?? []) {
      if (!parseModelIdentifier(fallback.model)) {
        toast.error(t('omoStatus.editor.validation.fallbackModelRequired'));
        return;
      }
    }

    try {
      await onSaveAssignment(scope, entry.name, savedAssignment);
      setEditing(false);
      toast.warning(t('omoStatus.editor.toast.savedRestartRequired'));
    } catch (error) {
      toast.error(t('omoStatus.editor.toast.saveFailed'), {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }, [draft, entry.name, onSaveAssignment, scope, t]);

  return (
    <div className={`py-3.5 ${!isLast ? 'border-b border-[var(--surface-subtle)]' : ''}`}>
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="break-all text-sm font-bold text-[var(--primary-base)]">{entry.name}</span>
            {entry.assignment.variant && (
              <span className="shrink-0 rounded bg-[var(--primary-muted)] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--primary-base)]">
                {entry.assignment.variant}
              </span>
            )}
          </div>
          <ModelSummary assignment={entry.assignment} />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          onClick={() => setEditing((value) => !value)}
          disabled={saving}
          aria-expanded={editing}
        >
          {editing ? t('omoStatus.editor.action.close') : t('omoStatus.editor.action.edit')}
        </Button>
      </div>

      {editing && (
        <OMOAssignmentFieldShell className="mt-3 space-y-3">
          <div className="space-y-2">
            <div className="typography-meta font-semibold uppercase tracking-wide text-[var(--surface-muted-foreground)]">
              {t('omoStatus.editor.primary')}
            </div>
            <OMOAssignmentFields assignment={draft} disabled={saving} onChange={setDraft} />
          </div>

          <div className="space-y-2 border-t border-[var(--surface-subtle)] pt-3">
            <div className="flex items-center justify-between gap-2">
              <div className="typography-meta font-semibold uppercase tracking-wide text-[var(--surface-muted-foreground)]">
                {t('omoStatus.editor.fallbacks')}
              </div>
              <Button type="button" variant="outline" size="xs" onClick={addFallback} disabled={saving}>
                <Icon name="add" className="h-3.5 w-3.5" />
                {t('omoStatus.editor.action.addFallback')}
              </Button>
            </div>

            {getFallbacks(draft).length === 0 ? (
              <div className="typography-meta text-[var(--surface-muted-foreground)]">
                {t('omoStatus.editor.fallbacks.none')}
              </div>
            ) : (
              <div className="space-y-2">
                {getFallbacks(draft).map((fallback, index) => (
                  <div key={`${index}-${fallback.model}`} className="rounded-lg border border-[var(--surface-subtle)] p-2">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="typography-meta text-[var(--surface-muted-foreground)]">
                        {t('omoStatus.editor.fallback.label', { count: index + 1 })}
                      </span>
                      <div className="flex items-center gap-1">
                        <Button type="button" variant="ghost" size="xs" onClick={() => moveFallback(index, -1)} disabled={saving || index === 0} aria-label={t('omoStatus.editor.action.moveFallbackUp')}>
                          <Icon name="arrow-up-s" className="h-3.5 w-3.5" />
                        </Button>
                        <Button type="button" variant="ghost" size="xs" onClick={() => moveFallback(index, 1)} disabled={saving || index === getFallbacks(draft).length - 1} aria-label={t('omoStatus.editor.action.moveFallbackDown')}>
                          <Icon name="arrow-down-s" className="h-3.5 w-3.5" />
                        </Button>
                        <Button type="button" variant="ghost" size="xs" onClick={() => removeFallback(index)} disabled={saving} aria-label={t('omoStatus.editor.action.removeFallback')}>
                          <Icon name="delete-bin" className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <OMOAssignmentFields assignment={fallback} disabled={saving} onChange={(next) => setFallback(index, next)} />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-[var(--surface-subtle)] pt-3">
            <Button type="button" variant="ghost" size="xs" onClick={cancelEditing} disabled={saving}>
              {t('omoStatus.editor.action.cancel')}
            </Button>
            <Button type="button" variant="default" size="xs" onClick={save} disabled={saving}>
              {saving ? t('omoStatus.editor.action.saving') : t('omoStatus.editor.action.save')}
            </Button>
          </div>
        </OMOAssignmentFieldShell>
      )}
    </div>
  );
};

export const OMOAssignmentList: React.FC<OMOAssignmentListProps> = ({
  entries,
  saving,
  scope,
  onSaveAssignment,
}) => (
  <div className="rounded-xl border border-[var(--interactive-border)] bg-[var(--surface-elevated)] px-4 shadow-sm">
    {entries.map((entry, idx) => (
      <OMOAssignmentRow
        key={entry.name}
        entry={entry}
        isLast={idx === entries.length - 1}
        saving={saving}
        scope={scope}
        onSaveAssignment={onSaveAssignment}
      />
    ))}
  </div>
);
