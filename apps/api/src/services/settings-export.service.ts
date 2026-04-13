import archiver from 'archiver';
import { join } from 'node:path';
import type { Readable } from 'node:stream';
import type { SessionContextResponse, ClaudeSettingsJson, McpConfig } from '@repo/types';
import type { UserContext } from '../lib/user-context.js';

/**
 * セッション設定を zip ストリームとして生成する
 *
 * 含まれるファイル:
 * - .claude/settings.json (permissions)
 * - mcp.json (MCP サーバー設定、headers 除外)
 * - .claude/skills/** (ユーザーのスキルディレクトリ全体)
 * - .claude/agents/** (ユーザーのエージェントディレクトリ全体)
 */
export function generateSettingsZip(
  ctx: UserContext,
  sessionContext: SessionContextResponse
): Readable {
  const archive = archiver('zip');

  // .claude/settings.json
  const settings: ClaudeSettingsJson = {};
  if (sessionContext.allowed_tools?.length || sessionContext.disallowed_tools?.length) {
    settings.permissions = {};
    if (sessionContext.allowed_tools?.length) {
      settings.permissions.allow = sessionContext.allowed_tools;
    }
    if (sessionContext.disallowed_tools?.length) {
      settings.permissions.deny = sessionContext.disallowed_tools;
    }
  }
  archive.append(JSON.stringify(settings, null, 2), { name: '.claude/settings.json' });

  // mcp.json — headers はランタイム固有の OBO トークンを含むため除外
  if (sessionContext.mcp_config?.mcpServers) {
    const mcpConfig: McpConfig = { mcpServers: {} };
    for (const [name, entry] of Object.entries(sessionContext.mcp_config.mcpServers)) {
      mcpConfig.mcpServers[name] = {
        type: entry.type,
        url: entry.url,
        ...(entry.tools ? { tools: entry.tools } : {}),
      };
    }
    archive.append(JSON.stringify(mcpConfig, null, 2), { name: 'mcp.json' });
  }

  // .claude/skills/ と .claude/agents/ — 存在しない場合 archiver は無視する
  archive.directory(join(ctx.userHome, '.claude', 'skills'), '.claude/skills');
  archive.directory(join(ctx.userHome, '.claude', 'agents'), '.claude/agents');

  archive.on('error', (err) => {
    archive.destroy(err);
  });

  archive.finalize();

  return archive;
}
