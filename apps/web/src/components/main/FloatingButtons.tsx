import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Rocket, FolderCode, Settings, Logs } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { APP_STATUS_POLLING_INTERVAL_MS } from '@/constants';
import { useUser } from '@/hooks/useUser';
import type { DatabricksApp } from '@repo/types';

interface FloatingButtonsProps {
  sessionId: string;
  showAppButton: boolean;
  /** Workspace object ID - ボタン表示は id の有無で判定 */
  workspaceObjectId?: number;
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

export function FloatingButtons({
  sessionId,
  showAppButton,
  workspaceObjectId,
}: FloatingButtonsProps) {
  const showWorkspaceButton = workspaceObjectId !== undefined;
  const { t } = useTranslation();
  const { databricksHost } = useUser();
  const [appInfo, setAppInfo] = useState<DatabricksApp | null>(null);
  const fetchAppInfoRef = useRef<() => Promise<void>>(undefined);

  const fetchAppInfo = useCallback(async () => {
    if (!showAppButton) return;
    try {
      const response = await fetch(`/api/sessions/${sessionId}/app`);
      if (!response.ok) {
        setAppInfo(prev => (prev === null ? prev : null));
        return;
      }
      const data: DatabricksApp = await response.json();
      setAppInfo(prev => {
        if (prev?.app_status?.state === data.app_status?.state && prev?.url === data.url) {
          return prev;
        }
        return data;
      });
    } catch {
      setAppInfo(prev => (prev === null ? prev : null));
    }
  }, [sessionId, showAppButton]);

  useEffect(() => {
    fetchAppInfoRef.current = fetchAppInfo;
  }, [fetchAppInfo]);

  useEffect(() => {
    if (!showAppButton) return;

    fetchAppInfoRef.current?.();

    const intervalId = setInterval(() => {
      fetchAppInfoRef.current?.();
    }, APP_STATUS_POLLING_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [showAppButton]);

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
    if (!workspaceObjectId || !databricksHost) return;
    const workspaceUrl = `https://${databricksHost}/browse/folders/${workspaceObjectId}`;
    window.open(workspaceUrl, '_blank');
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
                className="flex items-center gap-1 hover:opacity-70"
                onClick={handleOpenWorkspace}
              >
                <FolderCode className="h-4 w-4 text-foreground" />
                <span className="text-sm font-medium">{t('databricksApp.workspace')}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
