import type { Track } from '../../../model/src/index';
export { formatArtistNames } from '../../../model/src/index';

export type Album = { id: string; title: string; artist: string; license: string };
export type ArchiveSong = { id: string; title: string; artist: string; url: string; albumId: string; albumTitle: string; license: string };
export type MobileTrack = Track & { streamUrl: string; license: string; collectionId: string };
export type Playlist = { id: string; name: string; tracks: MobileTrack[] };

export function toTrack(s: ArchiveSong): MobileTrack {
  const source = { provider: 'internet-archive', id: s.id, url: 'https://archive.org/details/' + encodeURIComponent(s.albumId) };
  return { title: s.title, artists: [{ name: s.artist, roles: ['performer'] }],
    source, streamUrl: s.url, license: s.license, collectionId: s.albumId,
    album: { title: s.albumTitle, source: { ...source, id: s.albumId } },
    artwork: { items: [{ url: 'https://archive.org/services/img/' + encodeURIComponent(s.albumId), purpose: 'cover' }] },
  };
}
export function seekTime(value: number) {
  if (!Number.isFinite(value) || value < 0) return '0:00';
  return Math.floor(value / 60) + ':' + String(Math.floor(value % 60)).padStart(2, '0');
}
export function nextIndex(index: number, count: number, repeat: boolean): number | null {
  if (count < 1) return null;
  return index + 1 < count ? index + 1 : repeat ? 0 : null;
}
export function isTrack(value: unknown): value is MobileTrack {
  if (!value || typeof value !== 'object') return false;
  const t = value as MobileTrack;
  return typeof t.title === 'string' && typeof t.source?.id === 'string' &&
    Array.isArray(t.artists) && t.artists.every(a => a && typeof a.name === 'string') &&
    typeof t.collectionId === 'string' && typeof t.license === 'string' &&
    typeof t.streamUrl === 'string' && t.streamUrl.startsWith('https://archive.org/download/');
}
export function readList<T>(key: string, validator: (v: unknown) => v is T): T[] {
  try { const data: unknown = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(data) ? data.filter(validator) : []; } catch { return []; }
}
export function isPlaylist(x: unknown): x is Playlist {
  if (!x || typeof x !== 'object') return false;
  const p = x as Playlist;
  return typeof p.id === 'string' && typeof p.name === 'string' && Array.isArray(p.tracks) && p.tracks.every(isTrack);
}
