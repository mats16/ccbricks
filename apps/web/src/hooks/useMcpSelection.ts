import { useState, useEffect, useMemo, useCallback } from 'react';
import useLocalStorageState from 'use-local-storage-state';
import { genieService, mcpServerService } from '@/services';
import { useUser } from '@/hooks/useUser';
import {
  buildDbsqlMcpUrl,
  buildGenieMcpUrl,
  CLAUDE_CODE_PRESET_TOOLS,
  MCP_DBSQL_ID,
  STORAGE_KEY_ENABLED_MCP_SERVERS,
} from '@/constants';
import type { GenieSpace, McpConfig, McpServerEntry, McpServerRecord } from '@repo/types';

export interface McpSelectionItem {
  space_id: string;
  title: string;
  mcp_url: string;
  enabled: boolean;
}

interface UseMcpSelectionReturn {
  items: McpSelectionItem[];
  enabledCount: number;
  toggleItem: (spaceId: string) => void;
  /** グローバルで有効な全 MCP サーバーの設定（session_context.mcp_config 用） */
  buildMcpConfig: () => McpConfig | undefined;
  /** CLAUDE_CODE_PRESET_TOOLS + セッションで選択された MCP のツールパターン（session_context.allowed_tools 用） */
  buildAllowedTools: () => string[];
  /** セッションで無効化された MCP のツールパターン（session_context.disallowed_tools 用） */
  buildDisallowedTools: () => string[];
  isLoading: boolean;
}

export function useMcpSelection(): UseMcpSelectionReturn {
  const { databricksHost } = useUser();
  const [spaces, setSpaces] = useState<GenieSpace[]>([]);
  const [customServers, setCustomServers] = useState<McpServerRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // グローバル設定（MCP 設定ページで管理）
  const [globalEnabled] = useLocalStorageState<Record<string, boolean>>(
    STORAGE_KEY_ENABLED_MCP_SERVERS,
    { defaultValue: {} }
  );

  // セッションレベルのトグル状態
  const [sessionOverrides, setSessionOverrides] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [genieRes, customRes] = await Promise.all([
          genieService.listGenieSpaces().catch(() => ({ spaces: [] as GenieSpace[] })),
          mcpServerService.list().catch(() => ({ mcp_servers: [] as McpServerRecord[] })),
        ]);
        if (!cancelled) {
          setSpaces(genieRes.spaces ?? []);
          setCustomServers(customRes.mcp_servers ?? []);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // グローバルで有効な全 MCP をセッションドロップダウン用にリスト化
  const items: McpSelectionItem[] = useMemo(() => {
    const result: McpSelectionItem[] = [];

    // Databricks SQL
    if ((globalEnabled[MCP_DBSQL_ID] ?? true) && databricksHost) {
      result.push({
        space_id: MCP_DBSQL_ID,
        title: 'Databricks SQL',
        mcp_url: buildDbsqlMcpUrl(databricksHost),
        enabled: sessionOverrides[MCP_DBSQL_ID] ?? true,
      });
    }

    // Custom MCP Servers (id をそのまま MCP キーとして使用)
    for (const server of customServers) {
      if (globalEnabled[server.id]) {
        const displayUrl =
          server.type === 'stdio'
            ? [server.command, ...(server.args ?? [])].join(' ')
            : (server.url ?? '');
        result.push({
          space_id: server.id,
          title: server.display_name,
          mcp_url: displayUrl,
          enabled: sessionOverrides[server.id] ?? true,
        });
      }
    }

    // Genie Spaces
    for (const s of spaces.filter(s => globalEnabled[s.space_id])) {
      result.push({
        space_id: s.space_id,
        title: s.title,
        mcp_url: buildGenieMcpUrl(databricksHost, s.space_id),
        enabled: sessionOverrides[s.space_id] ?? true,
      });
    }

    return result;
  }, [spaces, customServers, globalEnabled, sessionOverrides, databricksHost]);

  const enabledCount = useMemo(() => items.filter(i => i.enabled).length, [items]);

  const toggleItem = useCallback((spaceId: string) => {
    setSessionOverrides(prev => ({
      ...prev,
      [spaceId]: !(prev[spaceId] ?? true),
    }));
  }, []);

  const customServerMap = useMemo(
    () => new Map(customServers.map(s => [s.id, s])),
    [customServers]
  );

  /** サーバー ID を MCP サーバーキーに変換 */
  const toServerKey = useCallback(
    (spaceId: string) => {
      if (spaceId === MCP_DBSQL_ID) return MCP_DBSQL_ID;
      if (customServerMap.has(spaceId)) return spaceId;
      return `genie_${spaceId}`;
    },
    [customServerMap]
  );

  /** カスタムサーバー ID から McpServerEntry を構築 */
  const buildCustomEntry = useCallback(
    (serverName: string): McpServerEntry | undefined => {
      const server = customServerMap.get(serverName);
      if (!server) return undefined;

      if (server.type === 'stdio') {
        return {
          type: 'stdio',
          command: server.command,
          args: server.args,
          env: server.env,
        };
      }

      return {
        type: server.type,
        url: server.url,
        headers: server.headers,
      };
    },
    [customServerMap]
  );

  // グローバルで有効な全サーバーを mcpServers に含める（常に接続）
  const buildMcpConfig = useCallback((): McpConfig | undefined => {
    const allItems = items.filter(i => i.mcp_url);
    if (allItems.length === 0) return undefined;

    const mcpServers: McpConfig['mcpServers'] = {};
    for (const item of allItems) {
      const key = toServerKey(item.space_id);
      const customEntry = buildCustomEntry(item.space_id);
      if (customEntry) {
        mcpServers[key] = customEntry;
      } else {
        mcpServers[key] = { type: 'http', url: item.mcp_url };
      }
    }
    return { mcpServers };
  }, [items, toServerKey, buildCustomEntry]);

  const buildToolPatterns = useCallback(
    (enabled: boolean): string[] =>
      items
        .filter(i => i.enabled === enabled && i.mcp_url)
        .map(i => `mcp__${toServerKey(i.space_id)}__*`),
    [items, toServerKey]
  );

  const buildAllowedTools = useCallback(
    (): string[] => [...CLAUDE_CODE_PRESET_TOOLS, ...buildToolPatterns(true)],
    [buildToolPatterns]
  );
  const buildDisallowedTools = useCallback(
    (): string[] => buildToolPatterns(false),
    [buildToolPatterns]
  );

  return {
    items,
    enabledCount,
    toggleItem,
    buildMcpConfig,
    buildAllowedTools,
    buildDisallowedTools,
    isLoading,
  };
}
