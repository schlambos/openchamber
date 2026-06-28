/**
 * OMO config types.
 *
 * Mirrors ~/.config/opencode/oh-my-openagent.json — the global OMO
 * (oh-my-openagent) configuration: agent and category model assignments
 * plus team-mode settings.
 */

export interface OMOFallbackModel {
  model: string;
  variant?: string;
}

export interface OMOModelAssignment {
  model: string;
  variant?: string;
  fallback_models?: OMOFallbackModel[];
}

export interface OMOTeamMode {
  enabled?: boolean;
  max_parallel_members?: number;
  max_members?: number;
  tmux_visualization?: boolean;
}

export interface OMOConfig {
  agents?: Record<string, OMOModelAssignment>;
  categories?: Record<string, OMOModelAssignment>;
  team_mode?: OMOTeamMode;
}

export interface OMOConfigResponse {
  installed: boolean;
  config: OMOConfig | null;
  error?: string;
}

export interface OMOAssignmentPatch {
  agents?: Record<string, OMOModelAssignment>;
  categories?: Record<string, OMOModelAssignment>;
}
