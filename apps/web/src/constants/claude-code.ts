/**
 * Claude Code エージェントのプリセットに相当するツール一覧。
 * 新規セッションの session_context.allowed_tools にはこれに加え MCP パターン（mcp__*__*）を付与する。
 */
export const CLAUDE_CODE_PRESET_TOOLS: readonly string[] = [
  'Task',
  'TaskOutput',
  'Bash',
  'Glob',
  'Grep',
  'ExitPlanMode',
  'Read',
  'Edit',
  'Write',
  'NotebookEdit',
  'WebFetch',
  'TodoWrite',
  'KillShell',
  'AskUserQuestion',
  'Skill',
  'EnterPlanMode',
];
