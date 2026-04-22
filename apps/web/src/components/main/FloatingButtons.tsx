import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Rocket, FolderCode, Settings, Logs, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { APP_STATUS_POLLING_INTERVAL_MS, APP_STATUS_POLLING_STABLE_INTERVAL_MS } from '@/constants';
import { useUser } from '@/hooks/useUser';
import { workspaceService } from '@/services';
import { toast } from 'sonner';
import type { DatabricksApp } from '@repo/types';

interface FloatingButtonsProps {
  sessionId: string;
  showAppButton: boolean;
  /** Workspace パス - ボタン表示は path の有無で判定 */
  workspacePath?: string;
}

type AppStateType = 'RUNNING' | 'DEPLOYING' | 'CRASHED' | 'UNAVAILABLE' | 'UNKNOWN';

interface AppStateStyle {
  iconClass: string;
  badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline';
  badgeClass: string;
}

const APP_STATE_STYLES: Record<AppStateType, AppStateStyle> = {
  RUNNING: {
    iconClass: 'text-green-500',
    badgeVariant: 'default',
    badgeClass: 'bg-green-500 hover:bg-green-500',
  },
  DEPLOYING: {
    iconClass: 'text-yellow-500 animate-spin',
    badgeVariant: 'secondary',
    badgeClass: 'bg-yellow-500 hover:bg-yellow-500 text-black',
  },
  CRASHED: {
    iconClass: 'text-red-500',
    badgeVariant: 'destructive',
    badgeClass: 'bg-red-500 hover:bg-red-500',
  },
  UNAVAILABLE: {
    iconClass: 'text-red-500',
    badgeVariant: 'destructive',
    badgeClass: 'bg-red-500 hover:bg-red-500',
  },
  UNKNOWN: {
    iconClass: 'text-foreground',
    badgeVariant: 'secondary',
    badgeClass: '',
  },
};

function getAppStateStyle(state: string | undefined): AppStateStyle {
  return APP_STATE_STYLES[(state as AppStateType) ?? 'UNKNOWN'] ?? APP_STATE_STYLES.UNKNOWN;
}

const STABLE_STATES = new Set<string>(['RUNNING', 'CRASHED', 'UNAVAILABLE']);

function getPollingInterval(state: string | undefined): number {
  return state && STABLE_STATES.has(state)
    ? APP_STATUS_POLLING_STABLE_INTERVAL_MS
    : APP_STATUS_POLLING_INTERVAL_MS;
}

export function FloatingButtons({ sessionId, showAppButton, workspacePath }: FloatingButtonsProps) {
  const showWorkspaceButton = !!workspacePath;
  const { t } = useTranslation();
  const { databricksHost } = useUser();
  const [appInfo, setAppInfo] = useState<DatabricksApp | null>(null);
  const [isOpeningWorkspace, setIsOpeningWorkspace] = useState(false);
  const workspaceObjectIdRef = useRef<number | undefined>(undefined);
  const fetchAppInfoRef = useRef<() => Promise<void>>(undefined);
  const appStateRef = useRef<string | undefined>(undefined);

  const fetchAppInfo = useCallback(async () => {
    if (!showAppButton) return;
    try {
      const response = await fetch(`/api/sessions/${sessionId}/app`);
      if (!response.ok) {
        console.warn(`[FloatingButtons] App info fetch failed with status ${response.status}`);
        setAppInfo(prev => (prev === null ? prev : null));
        return;
      }
      const data: unknown = await response.json();
      if (!data || typeof data !== 'object' || !('name' in data)) {
        setAppInfo(prev => (prev === null ? prev : null));
        return;
      }
      const app = data as DatabricksApp;
      appStateRef.current = app.app_status?.state;
      setAppInfo(prev => {
        if (prev?.app_status?.state === app.app_status?.state && prev?.url === app.url) {
          return prev;
        }
        return app;
      });
    } catch (error) {
      console.warn('[FloatingButtons] Failed to fetch app info:', error);
      setAppInfo(prev => (prev === null ? prev : null));
    }
  }, [sessionId, showAppButton]);

  useEffect(() => {
    fetchAppInfoRef.current = fetchAppInfo;
  }, [fetchAppInfo]);

  useEffect(() => {
    if (!showAppButton) return;

    let timeoutId: ReturnType<typeof setTimeout>;
    const poll = () => {
      fetchAppInfoRef.current?.();
      timeoutId = setTimeout(poll, getPollingInterval(appStateRef.current));
    };

    fetchAppInfoRef.current?.();
    timeoutId = setTimeout(poll, getPollingInterval(appStateRef.current));

    return () => clearTimeout(timeoutId);
  }, [showAppButton]);

  // Workspace object_id を pre-fetch してキャッシュ（クリック時の同期 window.open に必要）
  useEffect(() => {
    if (!workspacePath) return;
    workspaceService
      .getStatus(workspacePath)
      .then(status => {
        workspaceObjectIdRef.current = status.object_id;
      })
      .catch(() => {
        // pre-fetch failure is non-fatal; click handler will retry
      });
  }, [workspacePath]);

  const appState = appInfo?.app_status?.state ?? 'UNKNOWN';
  const style = getAppStateStyle(appState);

  const handleOpenApp = () => {
    if (appInfo?.url) {
      window.open(appInfo.url, '_blank');
    }
  };

  const handleOpenLogs = () => {
    if (appInfo?.url) {
      window.open(`${appInfo.url}/logz`, '_blank');
    }
  };

  const handleOpenConsole = () => {
    if (appInfo?.name && databricksHost) {
      const consoleUrl = `https://${databricksHost}/apps/${appInfo.name}`;
      window.open(consoleUrl, '_blank');
    }
  };

  const handleOpenWorkspace = () => {
    if (!workspacePath || !databricksHost) return;

    // pre-fetch 済み: 同期的に開く（ポップアップブロッカー回避）
    if (workspaceObjectIdRef.current !== undefined) {
      window.open(
        `https://${databricksHost}/browse/folders/${workspaceObjectIdRef.current}`,
        '_blank'
      );
      return;
    }

    // pre-fetch 未完了: 先にウィンドウを確保してから API 呼び出し
    const newWindow = window.open('', '_blank');
    if (!newWindow) {
      toast.error(t('databricksApp.workspaceOpenError'));
      return;
    }
    setIsOpeningWorkspace(true);
    workspaceService
      .getStatus(workspacePath)
      .then(status => {
        workspaceObjectIdRef.current = status.object_id;
        newWindow.location.href = `https://${databricksHost}/browse/folders/${status.object_id}`;
      })
      .catch(() => {
        newWindow.close();
        toast.error(t('databricksApp.workspaceOpenError'));
      })
      .finally(() => {
        setIsOpeningWorkspace(false);
      });
  };

  if (!showAppButton && !showWorkspaceButton) {
    return null;
  }

  return (
    <div className="absolute bottom-0 left-0 right-0 pb-[7.5rem] px-4 pointer-events-none z-10">
      <div className="w-full max-w-[735px] mx-auto flex justify-between items-center pointer-events-auto">
        {/* 左側: App ボタン */}
        <div>
          {showAppButton && (
            <div className="flex items-center h-8 px-3 rounded-lg shadow-lg bg-background border gap-2">
              <button
                className="flex items-center gap-1 hover:opacity-70 disabled:opacity-50"
                onClick={handleOpenApp}
                disabled={!appInfo?.url}
              >
                <Rocket className={cn('h-4 w-4', style.iconClass)} />
                <span className="text-sm font-medium">{t('databricksApp.app')}</span>
              </button>
              <Badge
                variant={style.badgeVariant}
                className={cn('text-xs px-1.5 py-0', style.badgeClass)}
              >
                {appState}
              </Badge>
              <span className="text-muted-foreground">|</span>
              <button
                className="flex items-center gap-1 hover:opacity-70 disabled:opacity-50"
                onClick={handleOpenLogs}
                disabled={!appInfo?.url}
              >
                <Logs className="h-4 w-4 text-foreground" />
                <span className="text-sm font-medium">{t('databricksApp.logs')}</span>
              </button>
              <span className="text-muted-foreground">|</span>
              <button
                className="hover:opacity-70 disabled:opacity-50"
                onClick={handleOpenConsole}
                disabled={!appInfo?.name}
              >
                <Settings className="h-4 w-4 text-foreground" />
              </button>
            </div>
          )}
        </div>

        {/* 右側: Workspace ボタン */}
        <div>
          {showWorkspaceButton && (
            <div className="flex items-center h-8 px-3 rounded-lg shadow-lg bg-background border">
              <button
                className="flex items-center gap-1 hover:opacity-70 disabled:opacity-50"
                onClick={handleOpenWorkspace}
                disabled={isOpeningWorkspace}
              >
                {isOpeningWorkspace ? (
                  <Loader2 className="h-4 w-4 animate-spin text-foreground" />
                ) : (
                  <FolderCode className="h-4 w-4 text-foreground" />
                )}
                <span className="text-sm font-medium">{t('databricksApp.workspace')}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
