import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import useLocalStorageState from 'use-local-storage-state';
import {
  Loader2,
  AlertCircle,
  DatabaseSearch,
  Sparkle,
  Plus,
  Trash2,
  Pencil,
  Server,
  Terminal,
  Globe,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { genieService, mcpServerService } from '@/services';
import { useUser } from '@/hooks/useUser';
import {
  buildDbsqlMcpUrl,
  buildGenieMcpUrl,
  MCP_DBSQL_ID,
  STORAGE_KEY_ENABLED_MCP_SERVERS,
} from '@/constants';
import type { GenieSpace, McpServerRecord, McpServerType } from '@repo/types';

interface KeyValuePair {
  key: string;
  value: string;
}

function KeyValueEditor({
  pairs,
  onChange,
  addLabel,
  keyPlaceholder = 'Key',
  valuePlaceholder = 'Value',
}: {
  pairs: KeyValuePair[];
  onChange: (pairs: KeyValuePair[]) => void;
  addLabel: string;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
}) {
  const addPair = () => onChange([...pairs, { key: '', value: '' }]);

  const removePair = (index: number) => onChange(pairs.filter((_, i) => i !== index));

  const updatePair = (index: number, field: 'key' | 'value', val: string) => {
    const updated = pairs.map((p, i) => (i === index ? { ...p, [field]: val } : p));
    onChange(updated);
  };

  return (
    <div className="space-y-2">
      {pairs.map((pair, index) => (
        <div key={index} className="flex items-center gap-2">
          <Input
            value={pair.key}
            onChange={e => updatePair(index, 'key', e.target.value)}
            placeholder={keyPlaceholder}
            className="font-mono text-sm flex-1"
          />
          <Input
            value={pair.value}
            onChange={e => updatePair(index, 'value', e.target.value)}
            placeholder={valuePlaceholder}
            className="font-mono text-sm flex-1"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => removePair(index)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addPair}>
        <Plus className="h-3 w-3 mr-1" />
        {addLabel}
      </Button>
    </div>
  );
}

function ServerTypeIcon({ type }: { type: McpServerType }) {
  if (type === 'stdio') return <Terminal className="h-4 w-4 shrink-0 text-muted-foreground" />;
  return <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />;
}

function ServerSubtitle({ server }: { server: McpServerRecord }) {
  if (server.type === 'stdio') {
    const parts = [server.command, ...(server.args ?? [])].join(' ');
    return <p className="text-xs text-muted-foreground/70 mt-1 ml-6 font-mono truncate">{parts}</p>;
  }
  if (server.url) {
    return (
      <p className="text-xs text-muted-foreground/70 mt-1 ml-6 font-mono truncate">{server.url}</p>
    );
  }
  return null;
}

function pairsToRecord(pairs: KeyValuePair[]): Record<string, string> | undefined {
  const record: Record<string, string> = {};
  for (const p of pairs) {
    const trimmedKey = p.key.trim();
    if (trimmedKey) record[trimmedKey] = p.value;
  }
  return Object.keys(record).length > 0 ? record : undefined;
}

function recordToPairs(record?: Record<string, string>): KeyValuePair[] {
  return record ? Object.entries(record).map(([key, value]) => ({ key, value })) : [];
}

interface ServerFormState {
  id: string;
  displayName: string;
  type: McpServerType;
  url: string;
  headers: KeyValuePair[];
  command: string;
  args: string;
  env: KeyValuePair[];
}

const EMPTY_FORM: ServerFormState = {
  id: '',
  displayName: '',
  type: 'http',
  url: '',
  headers: [],
  command: '',
  args: '',
  env: [],
};

function serverToFormState(server: McpServerRecord): ServerFormState {
  return {
    id: server.id,
    displayName: server.display_name,
    type: server.type,
    url: server.url ?? '',
    headers: recordToPairs(server.headers),
    command: server.command ?? '',
    args: server.args?.join(' ') ?? '',
    env: recordToPairs(server.env),
  };
}

function buildFormPayload(form: ServerFormState) {
  const trimmedArgs = form.args.trim();
  return {
    display_name: form.displayName.trim(),
    type: form.type,
    url: form.url.trim() || undefined,
    headers: pairsToRecord(form.headers),
    command: form.command.trim() || undefined,
    args: trimmedArgs ? trimmedArgs.split(/\s+/) : undefined,
    env: pairsToRecord(form.env),
  };
}

interface ServerFormDialogProps {
  mode: 'add' | 'edit';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: ServerFormState;
  onFormChange: (form: ServerFormState) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  formError: string | null;
}

function ServerFormDialog({
  mode,
  open,
  onOpenChange,
  form,
  onFormChange,
  onSubmit,
  isSubmitting,
  formError,
}: ServerFormDialogProps) {
  const { t } = useTranslation();
  const isNetworkType = form.type === 'http' || form.type === 'sse';
  const prefix = mode === 'add' ? 'mcp' : 'mcp-edit';

  const update = (patch: Partial<ServerFormState>) => onFormChange({ ...form, ...patch });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'add' ? t('mcp.addServer') : t('mcp.editServer')}</DialogTitle>
          <DialogDescription>
            {mode === 'add' ? t('mcp.addServerDescription') : t('mcp.editServerDescription')}
          </DialogDescription>
        </DialogHeader>

        {formError && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-md text-sm">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {formError}
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`${prefix}-id`}>{t('mcp.id')}</Label>
            {mode === 'add' ? (
              <Input
                id={`${prefix}-id`}
                value={form.id}
                onChange={e => update({ id: e.target.value })}
                placeholder={t('mcp.idPlaceholder')}
                className="font-mono"
              />
            ) : (
              <Input
                id={`${prefix}-id`}
                value={form.id}
                disabled
                className="font-mono opacity-60"
              />
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${prefix}-display-name`}>{t('mcp.displayName')}</Label>
            <Input
              id={`${prefix}-display-name`}
              value={form.displayName}
              onChange={e => update({ displayName: e.target.value })}
              placeholder={t('mcp.displayNamePlaceholder')}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('mcp.type')}</Label>
            <Select value={form.type} onValueChange={v => update({ type: v as McpServerType })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="http">http</SelectItem>
                <SelectItem value="sse">sse</SelectItem>
                <SelectItem value="stdio">stdio</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isNetworkType && (
            <>
              <div className="space-y-2">
                <Label htmlFor={`${prefix}-url`}>{t('mcp.url')}</Label>
                <Input
                  id={`${prefix}-url`}
                  value={form.url}
                  onChange={e => update({ url: e.target.value })}
                  placeholder={t('mcp.urlPlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('mcp.headers')}</Label>
                <KeyValueEditor
                  pairs={form.headers}
                  onChange={headers => update({ headers })}
                  addLabel={t('common.add')}
                  keyPlaceholder={t('mcp.headerKeyPlaceholder')}
                  valuePlaceholder={t('mcp.headerValuePlaceholder')}
                />
              </div>
            </>
          )}

          {form.type === 'stdio' && (
            <>
              <div className="space-y-2">
                <Label htmlFor={`${prefix}-command`}>{t('mcp.command')}</Label>
                <Input
                  id={`${prefix}-command`}
                  value={form.command}
                  onChange={e => update({ command: e.target.value })}
                  placeholder={t('mcp.commandPlaceholder')}
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${prefix}-args`}>{t('mcp.argsField')}</Label>
                <Input
                  id={`${prefix}-args`}
                  value={form.args}
                  onChange={e => update({ args: e.target.value })}
                  placeholder={t('mcp.argsPlaceholder')}
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('mcp.envField')}</Label>
                <KeyValueEditor
                  pairs={form.env}
                  onChange={env => update({ env })}
                  addLabel={t('common.add')}
                  keyPlaceholder={t('mcp.envKeyPlaceholder')}
                  valuePlaceholder={t('mcp.envValuePlaceholder')}
                />
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            {t('common.cancel')}
          </Button>
          <Button onClick={onSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            {mode === 'add' ? t('mcp.addServer') : t('common.save')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function McpContent() {
  const { t } = useTranslation();
  const { databricksHost, isAdmin } = useUser();
  const [spaces, setSpaces] = useState<GenieSpace[]>([]);
  const [customServers, setCustomServers] = useState<McpServerRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customError, setCustomError] = useState<string | null>(null);

  const [dialogMode, setDialogMode] = useState<'add' | 'edit' | null>(null);
  const [editingServerId, setEditingServerId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState<ServerFormState>(EMPTY_FORM);

  const [enabledServers, setEnabledServers] = useLocalStorageState<Record<string, boolean>>(
    STORAGE_KEY_ENABLED_MCP_SERVERS,
    { defaultValue: {} }
  );

  const fetchSpaces = useCallback(async () => {
    try {
      const response = await genieService.listGenieSpaces();
      setSpaces(response.spaces ?? []);
    } catch (err) {
      const detail = err instanceof Error ? err.message : '';
      setError(detail ? `${t('mcp.fetchError')}: ${detail}` : t('mcp.fetchError'));
    }
  }, [t]);

  const fetchCustomServers = useCallback(async () => {
    try {
      const response = await mcpServerService.list();
      setCustomServers(response.mcp_servers ?? []);
    } catch (err) {
      const detail = err instanceof Error ? err.message : '';
      setCustomError(
        detail ? `${t('mcp.customFetchError')}: ${detail}` : t('mcp.customFetchError')
      );
    }
  }, [t]);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([fetchSpaces(), fetchCustomServers()]).finally(() => setIsLoading(false));
  }, [fetchSpaces, fetchCustomServers]);

  const handleToggle = (key: string, checked: boolean) => {
    setEnabledServers(prev => ({ ...prev, [key]: checked }));
  };

  const closeDialog = () => {
    setDialogMode(null);
    setEditingServerId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
  };

  const openAddDialog = () => {
    setForm(EMPTY_FORM);
    setFormError(null);
    setDialogMode('add');
  };

  const openEditDialog = (server: McpServerRecord) => {
    setEditingServerId(server.id);
    setForm(serverToFormState(server));
    setFormError(null);
    setDialogMode('edit');
  };

  const validateForm = (): string | null => {
    if (dialogMode === 'add') {
      if (!form.id.trim()) return t('mcp.idRequired');
      if (!/^[a-z0-9]+(_[a-z0-9]+)*$/.test(form.id.trim())) return t('mcp.idInvalid');
    }
    if (!form.displayName.trim()) return t('mcp.displayNameRequired');
    if ((form.type === 'http' || form.type === 'sse') && !form.url.trim())
      return t('mcp.urlRequired');
    if (form.type === 'stdio' && !form.command.trim()) return t('mcp.commandRequired');
    return null;
  };

  const handleSubmit = async () => {
    setFormError(null);
    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    const payload = buildFormPayload(form);

    setIsSubmitting(true);
    try {
      if (dialogMode === 'add') {
        await mcpServerService.create({ id: form.id.trim(), ...payload });
        toast.success(t('mcp.addSuccess'));
      } else if (editingServerId) {
        await mcpServerService.update(editingServerId, payload);
        toast.success(t('mcp.editSuccess'));
      }
      closeDialog();
      await fetchCustomServers();
    } catch (err) {
      const detail = err instanceof Error ? err.message : '';
      setFormError(detail || t(dialogMode === 'add' ? 'mcp.addError' : 'mcp.editError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (server: McpServerRecord) => {
    try {
      await mcpServerService.remove(server.id);
      toast.success(t('mcp.deleteSuccess'));
      await fetchCustomServers();
    } catch {
      toast.error(t('mcp.deleteError'));
    }
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
      <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
        <div>
          <h1 className="text-xl font-bold">{t('mcp.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('mcp.description')}</p>
        </div>
        {isAdmin && (
          <Button size="sm" onClick={openAddDialog}>
            <Plus className="h-4 w-4 mr-1" />
            {t('mcp.addServer')}
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-auto p-4">
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-muted-foreground mb-2">Managed MCP</h2>
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

        <section className="mb-6">
          <h2 className="text-sm font-semibold text-muted-foreground mb-2">
            {t('mcp.customSection')}
          </h2>
          {customError && (
            <div className="flex items-center gap-2 p-3 mb-2 bg-destructive/10 text-destructive rounded-md text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {customError}
            </div>
          )}
          {!customError && customServers.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Server className="h-10 w-10 mb-3 opacity-50" />
              <p className="text-sm">{t('mcp.customEmpty')}</p>
            </div>
          )}
          <div className="space-y-2">
            {customServers.map(server => {
              const isEnabled = enabledServers[server.id] ?? false;

              return (
                <div
                  key={server.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1 min-w-0 mr-4">
                    <div className="flex items-center gap-2">
                      <ServerTypeIcon type={server.type} />
                      <Label htmlFor={`custom-${server.id}`} className="font-medium cursor-pointer">
                        {server.display_name}
                      </Label>
                      <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        {server.type}
                      </span>
                    </div>
                    <ServerSubtitle server={server} />
                  </div>
                  <div className="flex items-center gap-2">
                    {isAdmin && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => openEditDialog(server)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(server)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    <Switch
                      id={`custom-${server.id}`}
                      checked={isEnabled}
                      onCheckedChange={checked => handleToggle(server.id, checked)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-muted-foreground mb-2">Genie</h2>
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
                      <Label
                        htmlFor={`genie-${space.space_id}`}
                        className="font-medium cursor-pointer"
                      >
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

      {dialogMode && (
        <ServerFormDialog
          mode={dialogMode}
          open
          onOpenChange={open => {
            if (!open) closeDialog();
          }}
          form={form}
          onFormChange={setForm}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          formError={formError}
        />
      )}
    </div>
  );
}

export function McpPage() {
  return <McpContent />;
}
