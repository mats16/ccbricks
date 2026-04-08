import { FolderSync } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function SyncingIndicator() {
  const { t } = useTranslation();

  return (
    <div className="py-3 mb-8" role="status" aria-live="polite">
      <div className="flex items-center gap-2 text-sm">
        <FolderSync className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-muted-foreground">{t('main.syncingWorkspace')}</span>
      </div>
    </div>
  );
}
