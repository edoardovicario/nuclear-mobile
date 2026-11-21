import { platform } from '@tauri-apps/plugin-os';
export const isMobilePlatform = () => {
  const os = platform();
  return os === 'ios' || os === 'android';
};
