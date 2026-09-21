import { registerRootComponent } from 'expo';
import { NativeModules } from 'react-native';
import App from './App';

// registerRootComponent handles registering the component as 'main' for Expo
registerRootComponent(App);

// Register TrackPlayer background service safely only when native module exists
if (NativeModules.TrackPlayerModule) {
  try {
    const TrackPlayer = require('react-native-track-player').default;
    const TrackPlayerService = require('./src/service').default;
    TrackPlayer.registerPlaybackService(() => TrackPlayerService);
  } catch (e) {
    console.log('[TrackPlayer] Native module not present in Expo Go.');
  }
}
