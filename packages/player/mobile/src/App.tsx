import { FormEvent, useEffect, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Heart, House, Library, ListMusic, Music2, Pause, Play, Plus, Repeat, Search, SkipBack, SkipForward, Trash2 } from 'lucide-react';
import { Album, ArchiveSong, MobileTrack, Playlist, formatArtistNames, isPlaylist, isTrack, nextIndex, readList, seekTime, toTrack } from './model';

type Tab = 'home' | 'search' | 'library' | 'queue';
const keys = { favorites: 'nuclear-mobile:favorites:v1', playlists: 'nuclear-mobile:playlists:v1' };
const errorText = (e: unknown) => e instanceof Error ? e.message : String(e);

function Cover({ id, large = false }: { id: string; large?: boolean }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [id]);
  return <span className={'cover' + (large ? ' large' : '')}>{failed || !id ? <Music2 aria-hidden /> :
    <img alt="" loading="lazy" src={'https://archive.org/services/img/' + encodeURIComponent(id)} onError={() => setFailed(true)} />}</span>;
}

export function App() {
  const audio = useRef<HTMLAudioElement>(null);
  const request = useRef(0);
  const [tab, setTab] = useState<Tab>('home');
  const [query, setQuery] = useState('');
  const [albums, setAlbums] = useState<Album[]>([]);
  const [album, setAlbum] = useState<Album | null>(null);
  const [songs, setSongs] = useState<MobileTrack[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [playError, setPlayError] = useState('');
  const [storageError, setStorageError] = useState('');
  const [searched, setSearched] = useState(false);
  const [queue, setQueue] = useState<MobileTrack[]>([]);
  const [index, setIndex] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [repeat, setRepeat] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [favorites, setFavorites] = useState(() => readList(keys.favorites, isTrack));
  const [playlists, setPlaylists] = useState(() => readList(keys.playlists, isPlaylist));
  const [newPlaylist, setNewPlaylist] = useState('');
  const [selectedPlaylist, setSelectedPlaylist] = useState('');
  const current = queue[index];
  const playlist = playlists.find(p => p.id === selectedPlaylist);

  useEffect(() => {
    try {
      localStorage.setItem(keys.favorites, JSON.stringify(favorites));
      localStorage.setItem(keys.playlists, JSON.stringify(playlists));
      setStorageError('');
    } catch { setStorageError('Could not save your library.'); }
  }, [favorites, playlists]);

  async function search(e?: FormEvent, term = query) {
    e?.preventDefault();
    if (!term.trim()) return;
    const token = ++request.current;
    setTab('search'); setQuery(term); setBusy(true); setError('');
    setAlbum(null); setSongs([]); setAlbums([]); setSearched(true);
    try {
      const result = await invoke<Album[]>('archive_search', { query: term.trim() });
      if (token === request.current) setAlbums(result);
    } catch (e) { if (token === request.current) setError(errorText(e)); }
    finally { if (token === request.current) setBusy(false); }
  }
  async function openAlbum(a: Album) {
    const token = ++request.current;
    setAlbum(a); setSongs([]); setError(''); setBusy(true);
    try {
      const result = await invoke<ArchiveSong[]>('archive_tracks', { id: a.id });
      if (token === request.current) setSongs(result.map(toTrack));
    } catch (e) { if (token === request.current) setError(errorText(e)); }
    finally { if (token === request.current) setBusy(false); }
  }
  function backToResults() { ++request.current; setAlbum(null); setSongs([]); setBusy(false); setError(''); }

  function playAudio() {
    const a = audio.current;
    if (!a) return;
    setPlayError('');
    void a.play().catch(e => {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setPlayError('Playback failed: ' + errorText(e));
    });
  }
  function start(items: MobileTrack[], at: number) {
    const a = audio.current, track = items[at];
    if (!a || !track) return;
    setQueue(items); setIndex(at); setPosition(0); setDuration(0); setPlaying(false);
    a.src = track.streamUrl;
    playAudio();
  }
  function addToQueue(track: MobileTrack) {
    if (!current) { start([track], 0); return; }
    setQueue(q => [...q, track]);
  }
  function next() {
    const target = nextIndex(index, queue.length, repeat);
    if (target !== null) start(queue, target);
  }
  function previous() {
    if (!audio.current) return;
    if (audio.current.currentTime > 3 || index <= 0) audio.current.currentTime = 0;
    else start(queue, index - 1);
  }
  function seek(value: number) {
    if (!audio.current || !Number.isFinite(value) || duration <= 0) return;
    audio.current.currentTime = Math.max(0, Math.min(duration, value));
    setPosition(audio.current.currentTime);
  }
  function togglePlay() { if (audio.current?.paused) playAudio(); else audio.current?.pause(); }

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    const session = navigator.mediaSession;
    try {
      session.metadata = current && typeof MediaMetadata !== 'undefined' ? new MediaMetadata({
        title: current.title, artist: formatArtistNames(current.artists), album: current.album?.title,
        artwork: [{ src: 'https://archive.org/services/img/' + encodeURIComponent(current.collectionId) }],
      }) : null;
      session.playbackState = current ? (playing ? 'playing' : 'paused') : 'none';
    } catch { /* optional WebView feature */ }
  }, [current, playing]);
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    const session = navigator.mediaSession;
    const handlers: Partial<Record<MediaSessionAction, MediaSessionActionHandler>> = {
      play: playAudio, pause: () => audio.current?.pause(), nexttrack: next, previoustrack: previous,
      seekto: d => { if (d.seekTime !== undefined) seek(d.seekTime); },
    };
    for (const [action, handler] of Object.entries(handlers)) {
      try { session.setActionHandler(action as MediaSessionAction, handler); } catch { /* not supported */ }
    }
    return () => { for (const action of Object.keys(handlers)) {
      try { session.setActionHandler(action as MediaSessionAction, null); } catch { /* not supported */ }
    }};
  }, [index, queue, repeat, duration]);
  useEffect(() => {
    if (!('mediaSession' in navigator) || duration <= 0) return;
    try { navigator.mediaSession.setPositionState({ duration, position: Math.min(position, duration), playbackRate: 1 }); } catch { /* optional */ }
  }, [duration, position]);

  function favorite(t: MobileTrack) {
    setFavorites(old => old.some(x => x.source.id === t.source.id) ? old.filter(x => x.source.id !== t.source.id) : [...old, t]);
  }
  function createPlaylist(e: FormEvent) {
    e.preventDefault();
    const name = newPlaylist.trim();
    if (!name) return;
    const id = globalThis.crypto?.randomUUID?.() || String(Date.now());
    const p: Playlist = { id, name, tracks: [] };
    setPlaylists(old => [...old, p]); setSelectedPlaylist(p.id); setNewPlaylist('');
  }
  function saveTrack(t: MobileTrack, id: string) {
    if (!id) return;
    setPlaylists(old => old.map(p => p.id !== id || p.tracks.some(x => x.source.id === t.source.id) ? p : { ...p, tracks: [...p.tracks, t] }));
  }
  function trackRows(items: MobileTrack[], removable?: (t: MobileTrack) => void) {
    return <div className="track-list">{items.map((t, i) => <div className="track" key={t.source.id + ':' + i}>
      <button className="track-main" onClick={() => start(items, i)}><Cover id={t.collectionId}/><span><strong>{t.title}</strong><small>{formatArtistNames(t.artists)}</small></span></button>
      {removable ? <button className="icon" aria-label={'Remove ' + t.title} onClick={() => removable(t)}><Trash2/></button> :
      <><button className={'icon ' + (favorites.some(x => x.source.id === t.source.id) ? 'active' : '')} aria-label={'Favorite ' + t.title} onClick={() => favorite(t)}><Heart/></button>
      <button className="icon" aria-label={'Queue ' + t.title} onClick={() => addToQueue(t)}><Plus/></button></>}
    </div>)}</div>;
  }
  const tabs = [{id:'home',label:'Home',Icon:House},{id:'search',label:'Search',Icon:Search},{id:'library',label:'Library',Icon:Library},{id:'queue',label:'Queue',Icon:ListMusic}] as const;
  return <div className="app">
    <header><div className="brand"><Music2 aria-hidden/> Nuclear <span>Mobile</span></div><small>Unofficial open-source edition</small></header>
    <main>
      {tab === 'home' && <><div className="hero"><p className="eyebrow">DISCOVER MUSIC</p><h1>Find something to listen to.</h1><p>Explore recordings with declared Creative Commons licenses from Internet Archive.</p>
        <button className="primary" onClick={() => setTab('search')}><Search/> Search music</button></div>
        <h2>Explore</h2><div className="chips">{['Jazz','Classical','Ambient','Electronic','Folk'].map(t => <button key={t} onClick={() => void search(undefined,t)}>{t}</button>)}</div>
        <h2>Favorites</h2>{favorites.length ? trackRows(favorites.slice(0,6)) : <p className="muted">Your favorite tracks will appear here.</p>}</>}
      {tab === 'search' && <><h1>Search</h1><form className="search" onSubmit={e => void search(e)}><input aria-label="Search artist or recording" placeholder="Artist or recording" value={query} maxLength={150} onChange={e => setQuery(e.target.value)}/><button className="primary" aria-label="Search" disabled={!query.trim()}><Search/></button></form>
        {album && <><button className="secondary" onClick={backToResults}>← Results</button><div className="album-header"><Cover id={album.id} large/><div><h2>{album.title}</h2><p>{album.artist}</p><small>{album.license}</small></div></div></>}
        {busy && <p role="status">Loading music…</p>}{error && <p className="error" role="alert">{error}</p>}
        {!busy && !error && album && (songs.length ? <><button className="primary" onClick={() => start(songs,0)}><Play/> Play recording</button>{trackRows(songs)}</> : <p>No playable MP3 files found.</p>)}
        {!album && albums.map(a => <button className="album" key={a.id} onClick={() => void openAlbum(a)}><Cover id={a.id}/><span><strong>{a.title}</strong><small>{a.artist}</small></span><span>›</span></button>)}
        {!busy && !error && !album && searched && !albums.length && <p>No licensed recordings found. Try another search.</p>}
        {!searched && <p className="muted">Search by recording title or artist. Only a subset of Internet Archive is currently supported.</p>}</>}
      {tab === 'library' && <><h1>Library</h1><h2>Favorites</h2>{favorites.length ? trackRows(favorites) : <p className="muted">No favorites yet.</p>}
        <h2>Playlists</h2><form className="search" onSubmit={createPlaylist}><input aria-label="Playlist name" maxLength={80} placeholder="New playlist" value={newPlaylist} onChange={e=>setNewPlaylist(e.target.value)}/><button className="primary" aria-label="Create playlist" disabled={!newPlaylist.trim()}><Plus/></button></form>
        {playlists.map(p => <div className="playlist" key={p.id}><button className="secondary" onClick={() => setSelectedPlaylist(p.id)}>{p.name} · {p.tracks.length}</button><button className="icon" aria-label={'Delete '+p.name} onClick={() => { if (window.confirm('Delete this playlist?')) {setPlaylists(old => old.filter(x => x.id !== p.id)); if(selectedPlaylist===p.id) setSelectedPlaylist('');} }}><Trash2/></button></div>)}
        {playlist && <><h2>{playlist.name}</h2>{current && <button className="secondary" onClick={() => saveTrack(current, playlist.id)}><Plus/> Add current track</button>}
        {playlist.tracks.length > 0 && <><button className="primary" onClick={() => start(playlist.tracks,0)}><Play/> Play playlist</button>{trackRows(playlist.tracks,t=>setPlaylists(old=>old.map(p=>p.id===playlist.id?{...p,tracks:p.tracks.filter(x=>x.source.id!==t.source.id)}:p)))}</>}</>}
        {storageError && <p className="error">{storageError}</p>}</>}
      {tab === 'queue' && <><h1>Play queue</h1>{queue.length ? <>{queue.map((t,i) => <div className={'track '+(i===index?'selected':'')} key={t.source.id+':'+i}><button className="track-main" onClick={() => start(queue,i)}><Cover id={t.collectionId}/><span><strong>{t.title}</strong><small>{i===index?'Current track':formatArtistNames(t.artists)}</small></span></button>{i!==index&&<button className="icon" aria-label={'Remove '+t.title} onClick={()=>{setQueue(q=>q.filter((_,j)=>j!==i));if(i<index)setIndex(n=>n-1);}}><Trash2/></button>}</div>)}</> : <p className="muted">Choose a track to begin.</p>}</>}
    </main>
    <audio ref={audio} preload="metadata" onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)} onEnded={()=>{setPlaying(false);next();}} onTimeUpdate={()=>setPosition(audio.current?.currentTime||0)}
      onLoadedMetadata={()=>setDuration(Number.isFinite(audio.current?.duration)?audio.current!.duration:0)}
      onDurationChange={()=>setDuration(Number.isFinite(audio.current?.duration)?audio.current!.duration:0)}
      onError={()=>{setPlaying(false);setPlayError('This track cannot be played. Try another recording.');}} />
    <footer>{current && <section className="mini-player"><button className="track-main" onClick={()=>setExpanded(true)}><Cover id={current.collectionId}/><span><strong>{current.title}</strong><small>{formatArtistNames(current.artists)}</small></span></button><button className="icon" aria-label={playing?'Pause':'Play'} onClick={togglePlay}>{playing?<Pause/>:<Play/>}</button><button className="icon" aria-label="Next" onClick={next}><SkipForward/></button></section>}
      {playError && <p className="error playback-error" role="alert">{playError}</p>}
      <nav aria-label="Main navigation">{tabs.map(({id,label,Icon})=><button key={id} aria-current={tab===id?'page':undefined} onClick={()=>setTab(id)}><Icon/><small>{label}</small></button>)}</nav></footer>
    {expanded && current && <section role="dialog" aria-modal="true" aria-label="Now playing" className="now-playing"><button className="secondary" onClick={()=>setExpanded(false)}>↓ Close player</button><Cover id={current.collectionId} large/><h1>{current.title}</h1><p>{formatArtistNames(current.artists)}</p><input type="range" aria-label="Playback position" min={0} max={duration||1} value={Math.min(position,duration)} disabled={!duration} onChange={e=>seek(Number(e.target.value))}/><div className="times"><span>{seekTime(position)}</span><span>{seekTime(duration)}</span></div><div className="controls"><button className="icon" aria-label="Previous" onClick={previous}><SkipBack/></button><button className="primary play" aria-label={playing?'Pause':'Play'} onClick={togglePlay}>{playing?<Pause/>:<Play/>}</button><button className="icon" aria-label="Next" onClick={next}><SkipForward/></button></div><div className="controls"><button className={'icon '+(repeat?'active':'')} aria-label="Repeat queue" aria-pressed={repeat} onClick={()=>setRepeat(r=>!r)}><Repeat/></button><button className={'icon '+(favorites.some(t=>t.source.id===current.source.id)?'active':'')} aria-label="Favorite" onClick={()=>favorite(current)}><Heart/></button><select aria-label="Add track to playlist" value="" onChange={e=>saveTrack(current,e.target.value)}><option value="">Add to playlist</option>{playlists.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div><small className="muted license">Source: Internet Archive · {current.license}</small>{playError&&<p className="error" role="alert">{playError}</p>}</section>}
  </div>;
}
