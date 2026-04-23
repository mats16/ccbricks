import type {
  DatabricksWorkspaceSource,
  ResolvedDatabricksAppsOutcome,
  ResolvedSessionOutcome,
} from '@repo/types';

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
export function buildSystemPromptConfig(
  outcomes: ResolvedSessionOutcome[] = []
): SystemPromptConfig {
  const workspaceOutcome = outcomes.find(
    (o): o is DatabricksWorkspaceSource => o.type === 'databricks_workspace'
  );
  const appsOutcome = outcomes.find(
    (o): o is ResolvedDatabricksAppsOutcome => o.type === 'databricks_apps'
  );

  const instructions: string[] = [];

  if (workspaceOutcome?.path) {
    instructions.push(createWorkspacePushInstruction(workspaceOutcome.path));
  }
  if (appsOutcome?.name) {
    instructions.push(createDatabricksAppsInstruction(appsOutcome.name));
  }

  if (instructions.length > 0) {
    return {
      type: 'preset',
      preset: 'claude_code',
      append: instructions.join('\n\n'),
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

The workspace path is provided via the \`SESSION_WORKSPACE_PATH\` environment variable: \`${workspacePath}\`

### Important Instructions:

1. **DEVELOP** all your changes in the current working directory
2. **PUSH** your completed work to the specified Workspace path
3. **NEVER** push to a different workspace path without explicit permission

### CLI Reference:

- To push all files from the session directory to workspace:
  \`databricks workspace import-dir . "$SESSION_WORKSPACE_PATH" --overwrite\`
- To check the upload result:
  \`databricks workspace list "$SESSION_WORKSPACE_PATH"\`
`.trim();
}

/**
 * Databricks Apps へのデプロイ用 systemPrompt 追加指示を生成（CLI ベース）
 *
 * @param appName - 割り当て済みの Databricks App 名
 * @returns systemPrompt に追加する指示文字列
 */
export function createDatabricksAppsInstruction(appName: string): string {
  return `
## Databricks Apps Deployment

You have been assigned the app name: \`${appName}\`
The app name is also available via the \`SESSION_APP_NAME\` environment variable.

### Workflow:

1. **DEVELOP** your application in the current working directory
2. **PUSH** your code to the Workspace path (if configured)
3. **CREATE** the app (if it doesn't exist yet):
   \`databricks apps create ${appName}\`
4. **DEPLOY** the app from the Workspace source:
   \`databricks apps deploy ${appName} --source-code-path "$SESSION_WORKSPACE_PATH"\`
5. **VERIFY** deployment status:
   \`databricks apps get ${appName}\`

### Important:

- The app name \`${appName}\` is pre-assigned. Always use this exact name.
- Ensure your app has a valid \`app.yaml\` configuration file before deploying.
- After deploying, verify the app status shows \`RUNNING\` before reporting success.
- Do not consider the work done until the app is successfully deployed and verified.
`.trim();
}
