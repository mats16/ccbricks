/** 任意の文字列を小文字英数+アンダースコアの ID セグメントにサニタイズする */
export function sanitizeToIdSegment(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
}
