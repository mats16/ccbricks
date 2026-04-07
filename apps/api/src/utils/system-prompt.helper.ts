import type { DatabricksWorkspaceSource, SessionOutcome } from '@repo/types';

/** systemPrompt の設定型 */
export interface SystemPromptConfig {
  type: 'preset';
  preset: 'claude_code';
  append?: string;
}

/**
 * outcomes に基づいて systemPrompt 設定を構築
 *
 * @param outcomes - セッションの outcomes 配列
 * @returns systemPrompt の設定オブジェクト
 *
 * @example
 * ```typescript
 * const config = buildSystemPromptConfig(session_context.outcomes);
 * // Use in query() options: systemPrompt: config
 * ```
 */
export function buildSystemPromptConfig(outcomes: SessionOutcome[] = []): SystemPromptConfig {
  const workspaceOutcome = outcomes.find(
    (o): o is DatabricksWorkspaceSource => o.type === 'databricks_workspace'
  );

  const workspacePath = workspaceOutcome?.path;

  if (workspacePath) {
    return {
      type: 'preset',
      preset: 'claude_code',
      append: createWorkspacePushInstruction(workspacePath),
    };
  }
  return { type: 'preset', preset: 'claude_code' };
}

/**
 * Databricks Workspace にファイルをアップロードするための systemPrompt 追加指示を生成
 *
 * @param workspacePath - push 先の Databricks Workspace パス
 * @returns systemPrompt に追加する指示文字列
 *
 * @example
 * ```typescript
 * const instruction = createWorkspacePushInstruction('/Workspace/Users/user@example.com/project');
 * // Returns markdown instruction text for Claude
 * ```
 */
export function createWorkspacePushInstruction(workspacePath: string): string {
  return `
Your task is to complete the request described in the task description.

Instructions:
1. For questions: Research the codebase and provide a detailed answer
2. For implementations: Make the requested changes and push to Databricks Workspace

## Databricks Workspace Push Requirements

The workspace path is provided via the \`DATABRICKS_WORKSPACE_PATH\` environment variable: \`${workspacePath}\`

### Important Instructions:

1. **DEVELOP** all your changes in the current working directory
2. **PUSH** your completed work to the specified Workspace path
3. **NEVER** push to a different workspace path without explicit permission

### CLI Reference:

- To push all files from the session directory to workspace:
  \`databricks sync --include "*" --exclude .claude/settings.local.json . "$DATABRICKS_WORKSPACE_PATH"\`
- To check the upload result:
  \`databricks workspace list "$DATABRICKS_WORKSPACE_PATH"\`
`.trim();
}
