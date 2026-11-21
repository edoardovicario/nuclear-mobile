import { formatArtistNames } from '@nuclearplayer/model';
import { useQueueStore } from '../stores/queue/queueStore';
import { useSoundStore } from '../stores/soundStore';
import { playbackManager } from './playback';

let dispose: (() => void) | undefined;

// Use the original queue and playback manager; never create a second player.
export function initMobileMediaSession(): void {
  if (dispose || !('mediaSession' in navigator)) return;
  const session = navigator.mediaSession;
  let lastId: string | undefined;
  const updateMetadata = () => {
    const item = useQueueStore.getState().getCurrentItem();
    if (item?.id === lastId) return;
    lastId = item?.id;
    try {
      session.metadata = item && typeof MediaMetadata !== 'undefined'
        ? new MediaMetadata({
            title: item.track.title,
            artist: formatArtistNames(item.track.artists),
            album: item.track.album?.title,
            artwork: (item.track.artwork?.items ?? []).filter(a => /^https?:\/\//.test(a.url)).slice(0, 3).map(a => ({ src: a.url })),
          })
        : null;
    } catch { /* optional WebView support */ }
  };
  const updateState = () => {
    const { status, seek, duration } = useSoundStore.getState();
    try {
      session.playbackState = status === 'playing' ? 'playing' : status === 'paused' ? 'paused' : 'none';
      if (Number.isFinite(duration) && duration > 0 && Number.isFinite(seek)) {
        session.setPositionState({ duration, position: Math.max(0, Math.min(seek, duration)), playbackRate: 1 });
      } else session.setPositionState();
    } catch { /* unsupported state API */ }
  };
  const actions: [MediaSessionAction, MediaSessionActionHandler][] = [
    ['play', playbackManager.play],
    ['pause', playbackManager.pause],
    ['nexttrack', () => { useQueueStore.getState().goToNext(); }],
    ['previoustrack', () => { useQueueStore.getState().goToPrevious(); }],
    ['seekto', ({ seekTime }) => {
      const state = useSoundStore.getState();
      if (seekTime !== undefined && Number.isFinite(seekTime) && Number.isFinite(state.duration) && state.duration > 0) {
        state.seekTo(Math.max(0, Math.min(seekTime, state.duration)));
      }
    }],
  ];
  for (const [name, handler] of actions) {
    try { session.setActionHandler(name, handler); } catch { /* unsupported action */ }
  }
  const unsubQueue = useQueueStore.subscribe(updateMetadata);
  const unsubSound = useSoundStore.subscribe(updateState);
  updateMetadata();
  updateState();
  dispose = () => {
    unsubQueue(); unsubSound();
    for (const [name] of actions) {
      try { session.setActionHandler(name, null); } catch { /* optional */ }
    }
    dispose = undefined;
  };
}
