import React from 'react';
import { Icon } from '@/components/icon/Icon';
import { ModelSelector } from '@/components/sections/agents/ModelSelector';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useI18n } from '@/lib/i18n';
import { parseModelIdentifier } from '@/lib/modelIdentifier';
import { cn } from '@/lib/utils';
import { useConfigStore } from '@/stores/useConfigStore';
import type { OMOModelAssignment } from '@/lib/omo-state/types';

type VariantProvider = {
  readonly id: string;
  readonly models?: readonly {
    readonly id?: string;
    readonly variants?: Record<string, unknown>;
  }[];
};

const DEFAULT_VARIANT_VALUE = '__default';

const getVariantOptionsForModel = (
  providers: readonly VariantProvider[],
  modelValue: string,
): string[] => {
  const parsedModel = parseModelIdentifier(modelValue);
  if (!parsedModel) return [];

  const provider = providers.find((item) => item.id === parsedModel.providerId);
  const model = provider?.models?.find((item) => item.id === parsedModel.modelId);
  return model?.variants ? Object.keys(model.variants) : [];
};

interface OMOAssignmentFieldsProps {
  assignment: OMOModelAssignment;
  disabled: boolean;
  onChange: (assignment: OMOModelAssignment) => void;
}

export const OMOAssignmentFields: React.FC<OMOAssignmentFieldsProps> = ({
  assignment,
  disabled,
  onChange,
}) => {
  const { t } = useI18n();
  const providers = useConfigStore((state) => state.providers);
  const parsedModel = parseModelIdentifier(assignment.model);
  const variant = assignment.variant ?? '';
  const variantOptions = React.useMemo(
    () => getVariantOptionsForModel(providers, assignment.model),
    [assignment.model, providers],
  );
  const shouldUseVariantSelect = variantOptions.length > 0 && (!variant || variantOptions.includes(variant));

  const setModel = React.useCallback((providerId: string, modelId: string) => {
    onChange({
      ...assignment,
      model: providerId && modelId ? `${providerId}/${modelId}` : '',
      variant: undefined,
    });
  }, [assignment, onChange]);

  const setVariant = React.useCallback((nextVariant: string) => {
    onChange({
      ...assignment,
      variant: nextVariant.trim() || undefined,
    });
  }, [assignment, onChange]);

  return (
    <div className="space-y-2">
      <div className="space-y-1.5">
        <div className="typography-meta font-medium text-[var(--surface-muted-foreground)]">
          {t('omoStatus.editor.field.model')}
        </div>
        <ModelSelector
          providerId={parsedModel?.providerId ?? ''}
          modelId={parsedModel?.modelId ?? ''}
          onChange={setModel}
          className="h-7 max-w-full w-full justify-between"
          tooltipsEnabled={false}
          dropdownPortalToBody
          placeholder={t('omoStatus.editor.model.placeholder')}
        />
      </div>

      <div className="space-y-1.5">
        <div className="typography-meta font-medium text-[var(--surface-muted-foreground)]">
          {t('omoStatus.editor.field.variant')}
        </div>
        <div className="flex min-w-0 items-center gap-2">
          {shouldUseVariantSelect ? (
            <Select
              value={variant || DEFAULT_VARIANT_VALUE}
              onValueChange={(value) => setVariant(value === DEFAULT_VARIANT_VALUE ? '' : value)}
            >
              <SelectTrigger className="h-7 min-w-0 flex-1">
                <SelectValue placeholder={t('omoStatus.editor.variant.placeholder')}>
                  {(value) => value === DEFAULT_VARIANT_VALUE ? t('chat.modelControls.default') : value}
                </SelectValue>
              </SelectTrigger>
              <SelectContent portalToBody>
                <SelectItem value={DEFAULT_VARIANT_VALUE}>{t('chat.modelControls.default')}</SelectItem>
                {variantOptions.map((variantOption) => (
                  <SelectItem key={variantOption} value={variantOption}>{variantOption}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              value={variant}
              onChange={(event) => setVariant(event.target.value)}
              placeholder={t('omoStatus.editor.variant.placeholder')}
              className="h-7 min-w-0 flex-1 bg-transparent"
              disabled={disabled}
            />
          )}
          {variant && (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => setVariant('')}
              disabled={disabled}
              className="h-7 w-7 px-0 text-[var(--surface-muted-foreground)]"
              aria-label={t('settings.common.actions.clear')}
              title={t('settings.common.actions.clear')}
            >
              <Icon name="close" className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export const OMOAssignmentFieldShell: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <div className={cn('rounded-lg border border-[var(--interactive-border)] bg-[var(--surface-background)] p-3', className)}>
    {children}
  </div>
);
