import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import useLocalStorageState from 'use-local-storage-state';
import { Loader2, AlertCircle, DatabaseSearch, Sparkle } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { genieService } from '@/services';
import { useUser } from '@/hooks/useUser';
import { buildDbsqlMcpUrl, buildGenieMcpUrl, MCP_DBSQL_ID, STORAGE_KEY_ENABLED_MCP_SERVERS } from '@/constants';
import type { GenieSpace } from '@repo/types';

export function McpContent() {
  const { t } = useTranslation();
  const { databricksHost } = useUser();
  const [spaces, setSpaces] = useState<GenieSpace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [enabledServers, setEnabledServers] = useLocalStorageState<Record<string, boolean>>(
    STORAGE_KEY_ENABLED_MCP_SERVERS,
    { defaultValue: {} }
  );

  const fetchSpaces = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await genieService.listGenieSpaces();
      setSpaces(response.spaces ?? []);
    } catch (err) {
      const detail = err instanceof Error ? err.message : '';
      setError(detail ? `${t('mcp.fetchError')}: ${detail}` : t('mcp.fetchError'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchSpaces();
  }, [fetchSpaces]);

  const handleToggle = (spaceId: string, checked: boolean) => {
    setEnabledServers(prev => ({
      ...prev,
      [spaceId]: checked,
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
        <div>
          <h1 className="text-xl font-bold">{t('mcp.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('mcp.description')}</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {/* Managed MCP */}
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-muted-foreground mb-2">
            Managed MCP
          </h2>
          <div className="space-y-2">
            {(() => {
              const dbsqlUrl = buildDbsqlMcpUrl(databricksHost);
              const isDbsqlEnabled = enabledServers[MCP_DBSQL_ID] ?? true;
              return (
                <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors">
                  <div className="flex-1 min-w-0 mr-4">
                    <div className="flex items-center gap-2">
                      <DatabaseSearch className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <Label htmlFor={`mcp-${MCP_DBSQL_ID}`} className="font-medium cursor-pointer">
                        Databricks SQL
                      </Label>
                    </div>
                    {dbsqlUrl && (
                      <p className="text-xs text-muted-foreground/70 mt-1 ml-6 font-mono truncate">
                        {dbsqlUrl}
                      </p>
                    )}
                  </div>
                  <Switch
                    id={`mcp-${MCP_DBSQL_ID}`}
                    checked={isDbsqlEnabled}
                    onCheckedChange={checked => handleToggle(MCP_DBSQL_ID, checked)}
                  />
                </div>
              );
            })()}
          </div>
        </section>

        {/* Genie */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground mb-2">
            Genie
          </h2>
          {error && (
            <div className="flex items-center gap-2 p-3 mb-2 bg-destructive/10 text-destructive rounded-md text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}
          {!error && spaces.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Sparkle className="h-10 w-10 mb-3 opacity-50" />
              <p className="text-sm">{t('mcp.empty')}</p>
            </div>
          )}
          <div className="space-y-2">
            {spaces.map(space => {
              const mcpUrl = buildGenieMcpUrl(databricksHost, space.space_id);
              const isEnabled = enabledServers[space.space_id] ?? false;

              return (
                <div
                  key={space.space_id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1 min-w-0 mr-4">
                    <div className="flex items-center gap-2">
                      <Sparkle className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <Label htmlFor={`genie-${space.space_id}`} className="font-medium cursor-pointer">
                        {space.title}
                      </Label>
                    </div>
                    {space.description && (
                      <p className="text-sm text-muted-foreground mt-1 ml-6 line-clamp-2">
                        {space.description}
                      </p>
                    )}
                    {mcpUrl && (
                      <p className="text-xs text-muted-foreground/70 mt-1 ml-6 font-mono truncate">
                        {mcpUrl}
                      </p>
                    )}
                  </div>
                  <Switch
                    id={`genie-${space.space_id}`}
                    checked={isEnabled}
                    onCheckedChange={checked => handleToggle(space.space_id, checked)}
                  />
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

export function McpPage() {
  return <McpContent />;
}
