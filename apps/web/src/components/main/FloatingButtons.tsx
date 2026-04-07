import { useTranslation } from 'react-i18next';
import { FolderCode } from 'lucide-react';
import { useUser } from '@/hooks/useUser';

interface FloatingButtonsProps {
  /** Workspace object ID - ボタン表示は id の有無で判定 */
  workspaceObjectId?: number;
}

export function FloatingButtons({ workspaceObjectId }: FloatingButtonsProps) {
  const showWorkspaceButton = workspaceObjectId !== undefined;
  const { t } = useTranslation();
  const { databricksHost } = useUser();

  const handleOpenWorkspace = () => {
    if (!workspaceObjectId || !databricksHost) return;
    // object_id を使用して正しい URL 形式で開く
    const workspaceUrl = `https://${databricksHost}/browse/folders/${workspaceObjectId}`;
    window.open(workspaceUrl, '_blank');
  };

  if (!showWorkspaceButton) {
    return null;
  }

  return (
    <div className="absolute bottom-0 left-0 right-0 pb-[7.5rem] px-4 pointer-events-none z-10">
      <div className="w-full max-w-[735px] mx-auto flex justify-end items-center pointer-events-auto">
        <div className="flex items-center h-8 px-3 rounded-lg shadow-lg bg-background border">
          <button
            className="flex items-center gap-1 hover:opacity-70"
            onClick={handleOpenWorkspace}
          >
            <FolderCode className="h-4 w-4 text-foreground" />
            <span className="text-sm font-medium">{t('databricksApp.workspace')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
