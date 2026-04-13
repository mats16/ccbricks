/**
 * バックエンド API から設定 zip をダウンロードする
 */
export async function downloadSessionSettings(
  sessionId: string,
  sessionTitle?: string
): Promise<void> {
  const res = await fetch(
    `/api/user/download-settings?session_id=${encodeURIComponent(sessionId)}`
  );
  if (!res.ok) throw new Error('Failed to download settings');

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${sanitizeFilename(sessionTitle ?? 'session')}-settings.zip`;
  a.click();
  URL.revokeObjectURL(url);
}

/** ファイル名に使えない文字を除去 */
function sanitizeFilename(name: string): string {
  return name.replace(/[/\\?%*:|"<>]/g, '-').trim() || 'session';
}
