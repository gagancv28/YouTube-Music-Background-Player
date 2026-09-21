import { NativeModules } from 'react-native';

let onRemoteCommandCallback: ((command: string) => void) | null = null;

export function registerRemoteControlCallback(callback: (command: string) => void) {
  onRemoteCommandCallback = callback;
}

export default async function TrackPlayerService() {
  if (!NativeModules.TrackPlayerModule) return;

  try {
    const { default: TrackPlayer, Event } = require('react-native-track-player');

    TrackPlayer.addEventListener(Event.RemotePlay, () => {
      console.log('[TrackPlayerService] RemotePlay triggered');
      if (onRemoteCommandCallback) onRemoteCommandCallback('PLAY');
    });

    TrackPlayer.addEventListener(Event.RemotePause, () => {
      console.log('[TrackPlayerService] RemotePause triggered');
      if (onRemoteCommandCallback) onRemoteCommandCallback('PAUSE');
    });

    TrackPlayer.addEventListener(Event.RemoteNext, () => {
      console.log('[TrackPlayerService] RemoteNext triggered');
      if (onRemoteCommandCallback) onRemoteCommandCallback('NEXT');
    });

    TrackPlayer.addEventListener(Event.RemotePrevious, () => {
      console.log('[TrackPlayerService] RemotePrevious triggered');
      if (onRemoteCommandCallback) onRemoteCommandCallback('PREV');
    });

    TrackPlayer.addEventListener(Event.RemoteStop, () => {
      console.log('[TrackPlayerService] RemoteStop triggered');
      if (onRemoteCommandCallback) onRemoteCommandCallback('PAUSE');
    });
  } catch (e) {
    console.log('[TrackPlayerService] Disabled in Expo Go environment.');
  }
}
