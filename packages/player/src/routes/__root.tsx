import { createRootRoute } from '@tanstack/react-router';
import { getCurrentWindow } from '@tauri-apps/api/window';
import {
  CableIcon,
  DiscIcon,
  GaugeIcon,
  HistoryIcon,
  ListMusicIcon,
  MicVocalIcon,
  MusicIcon,
  SettingsIcon,
  UserIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { platform } from '@tauri-apps/plugin-os';
import './mobile-layout.css';

import { useTranslation } from '@nuclearplayer/i18n';
import {
  PlayerShell,
  PlayerWorkspace,
  RouteTransition,
  SidebarNavigation,
  SidebarNavigationItem,
  Toaster,
} from '@nuclearplayer/ui';

import { ConnectedPlayerBar } from '../components/ConnectedPlayerBar';
import {
  ConnectedQueuePanel,
  QueueHeaderActions,
} from '../components/ConnectedQueuePanel';
import { ConnectedSettingsModal } from '../components/ConnectedSettingsModal';
import { ConnectedStreamVerification } from '../components/ConnectedStreamVerification';
import { ConnectedTitleBar } from '../components/ConnectedTitleBar';
import { ConnectedTopBar } from '../components/ConnectedTopBar';
import { CustomViewSidebarEntries } from '../components/CustomViewSidebarEntries';
import { DevTools } from '../components/DevTools';
import { FlatpakWarningBanner } from '../components/FlatpakWarningBanner';
import { SoundProvider } from '../components/SoundProvider';
import { StreamResolver } from '../components/StreamResolver';
import { GlobalShortcuts } from '../shortcuts';
import { useLayoutStore } from '../stores/layoutStore';
import { useSettingsModalStore } from '../stores/settingsModalStore';
import { useStartupStore } from '../stores/startupStore';

const RootComponent = () => {
  const [narrow, setNarrow] = useState(() => window.matchMedia('(max-width: 760px)').matches);
  const [panel, setPanel] = useState<'content' | 'navigation' | 'queue'>('content');
  const mobile = platform() === 'android' || platform() === 'ios';
  useEffect(() => {
    const media = window.matchMedia('(max-width: 760px)');
    const update = () => setNarrow(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  const compact = narrow || mobile;
  const { t } = useTranslation('navigation');
  const { t: tPrefs } = useTranslation('preferences');
  const {
    leftSidebar,
    rightSidebar,
    toggleLeftSidebar,
    toggleRightSidebar,
    setLeftSidebarWidth,
    setRightSidebarWidth,
  } = useLayoutStore();
  const openSettings = useSettingsModalStore((state) => state.open);
  const isStartingUp = useStartupStore((state) => state.isStartingUp);
  useEffect(() => {
    if (mobile) return;
    const window = getCurrentWindow();
    void window.show().then(() => window.setFocus());
  }, [mobile]);
  const navigation = (
            <SidebarNavigation isCompact={compact ? false : leftSidebar.isCollapsed}>
              <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
                <SidebarNavigationItem
                  to="/dashboard"
                  icon={<GaugeIcon />}
                  label={t('dashboard')}
                />
                <SidebarNavigationItem
                  to="/favorites/albums"
                  icon={<DiscIcon />}
                  label={t('favoriteAlbums')}
                />
                <SidebarNavigationItem
                  to="/favorites/tracks"
                  icon={<MusicIcon />}
                  label={t('favoriteTracks')}
                />
                <SidebarNavigationItem
                  to="/favorites/artists"
                  icon={<UserIcon />}
                  label={t('favoriteArtists')}
                />
                <SidebarNavigationItem
                  to="/playlists"
                  icon={<ListMusicIcon />}
                  label={t('playlists')}
                />
                <SidebarNavigationItem
                  to="/history"
                  icon={<HistoryIcon />}
                  label={t('history')}
                />
                <SidebarNavigationItem
                  to="/lyrics"
                  icon={<MicVocalIcon />}
                  label={t('lyrics')}
                />
                <SidebarNavigationItem
                  to="/sources"
                  icon={<CableIcon />}
                  label={t('sources')}
                />
                <CustomViewSidebarEntries />
              </div>
              <SidebarNavigationItem
                icon={<SettingsIcon />}
                label={tPrefs('title')}
                onClick={() => openSettings()}
              />
            </SidebarNavigation>
  );
  return (
    <PlayerShell className={compact ? 'nuclear-mobile-shell' : undefined} onContextMenu={(e) => e.preventDefault()}>
      <GlobalShortcuts />
      <div>
        {!mobile && <ConnectedTitleBar />}
        {!mobile && <FlatpakWarningBanner />}
        <ConnectedTopBar />
      </div>
      {!isStartingUp && <StreamResolver />}
      <SoundProvider>
        {compact ? (
          <div className="nuclear-mobile-workspace">
            <nav className="nuclear-mobile-nav" aria-label={t('dashboard')}>
              <button type="button" aria-pressed={panel === 'navigation'} onClick={() => setPanel(panel === 'navigation' ? 'content' : 'navigation')}>☰</button>
              <button type="button" aria-pressed={panel === 'content'} onClick={() => setPanel('content')}>{t('dashboard')}</button>
              <button type="button" aria-pressed={panel === 'queue'} onClick={() => setPanel(panel === 'queue' ? 'content' : 'queue')}>♫</button>
            </nav>
            <div className="nuclear-mobile-content" hidden={panel !== 'content'}>
              <PlayerWorkspace.Main><RouteTransition /></PlayerWorkspace.Main>
            </div>
            <div hidden={panel !== 'navigation'} className="nuclear-mobile-panel" onClick={e => {
              if ((e.target as HTMLElement).closest('a')) setPanel('content');
            }}>{navigation}</div>
            <div hidden={panel !== 'queue'} className="nuclear-mobile-panel">
              <QueueHeaderActions />
              <ConnectedQueuePanel isCollapsed={false} />
              <ConnectedStreamVerification />
            </div>
          </div>
        ) : <PlayerWorkspace>
          <PlayerWorkspace.LeftSidebar
            width={leftSidebar.width}
            isCollapsed={leftSidebar.isCollapsed}
            onWidthChange={setLeftSidebarWidth}
            onToggle={toggleLeftSidebar}
          >
            {navigation}
          </PlayerWorkspace.LeftSidebar>

          <PlayerWorkspace.Main>
            <RouteTransition />
          </PlayerWorkspace.Main>

          <PlayerWorkspace.RightSidebar
            width={rightSidebar.width}
            isCollapsed={rightSidebar.isCollapsed}
            onWidthChange={setRightSidebarWidth}
            onToggle={toggleRightSidebar}
            headerActions={<QueueHeaderActions />}
            footer={<ConnectedStreamVerification />}
          >
            <ConnectedQueuePanel isCollapsed={rightSidebar.isCollapsed} />
          </PlayerWorkspace.RightSidebar>
        </PlayerWorkspace>}
      </SoundProvider>

      <ConnectedPlayerBar />
      <Toaster />
      <ConnectedSettingsModal />
      <DevTools />
    </PlayerShell>
  );
};

export const Route = createRootRoute({
  component: RootComponent,
});
