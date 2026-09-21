import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  StatusBar,
  BackHandler,
  View,
  Text,
  ActivityIndicator,
  NativeModules,
} from 'react-native';
import { WebView, WebViewNavigation } from 'react-native-webview';
import { INJECTED_JAVASCRIPT } from './src/injectedJS';
import { registerRemoteControlCallback } from './src/service';

// Domain allowlist definition
const ALLOWED_DOMAINS = [
  'music.youtube.com',
  'accounts.google.com',
  'myaccount.google.com',
  'ssl.gstatic.com',
  'google.com/accounts',
  'apis.google.com',
];

// Linux Desktop User-Agent forcing desktop YouTube web player
const DESKTOP_USER_AGENT =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

export default function App() {
  const webViewRef = useRef<WebView>(null);
  const [isTrackPlayerReady, setIsTrackPlayerReady] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize TrackPlayer safely if running in a native custom build
  useEffect(() => {
    let isMounted = true;

    if (!NativeModules.TrackPlayerModule) {
      if (isMounted) setIsTrackPlayerReady(false);
      return;
    }

    const setupTrackPlayer = async () => {
      try {
        const { default: TrackPlayer, Capability, AppKilledPlaybackBehavior } = require('react-native-track-player');

        await TrackPlayer.setupPlayer({
          autoHandleBleed: true,
        });

        await TrackPlayer.updateOptions({
          android: {
            appKilledPlaybackBehavior: AppKilledPlaybackBehavior.ContinuePlayback,
          },
          capabilities: [
            Capability.Play,
            Capability.Pause,
            Capability.SkipToNext,
            Capability.SkipToPrevious,
          ],
          compactCapabilities: [
            Capability.Play,
            Capability.Pause,
            Capability.SkipToNext,
          ],
        });

        await TrackPlayer.add({
          id: 'ytmusic_stream',
          url: 'https://music.youtube.com',
          title: 'YouTube Music',
          artist: 'Ready to play',
          artwork: 'https://music.youtube.com/img/favicon_144.png',
        });

        if (isMounted) {
          setIsTrackPlayerReady(true);
        }
      } catch (error) {
        console.warn('TrackPlayer setup note:', error);
      }
    };

    setupTrackPlayer();

    return () => {
      isMounted = false;
    };
  }, []);

  // Handle hardware back button
  useEffect(() => {
    const onBackPress = () => {
      if (canGoBack && webViewRef.current) {
        webViewRef.current.goBack();
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      onBackPress
    );
    return () => backHandler.remove();
  }, [canGoBack]);

  // Remote control commands handler
  const handleRemoteCommand = useCallback((command: string) => {
    if (!webViewRef.current) return;

    switch (command) {
      case 'PLAY':
        webViewRef.current.injectJavaScript('window.__YT_PLAY && window.__YT_PLAY(); true;');
        if (NativeModules.TrackPlayerModule) {
          try { require('react-native-track-player').default.play(); } catch (e) {}
        }
        break;
      case 'PAUSE':
        webViewRef.current.injectJavaScript('window.__YT_PAUSE && window.__YT_PAUSE(); true;');
        if (NativeModules.TrackPlayerModule) {
          try { require('react-native-track-player').default.pause(); } catch (e) {}
        }
        break;
      case 'NEXT':
        webViewRef.current.injectJavaScript('window.__YT_NEXT && window.__YT_NEXT(); true;');
        break;
      case 'PREV':
        webViewRef.current.injectJavaScript('window.__YT_PREV && window.__YT_PREV(); true;');
        break;
    }
  }, []);

  useEffect(() => {
    registerRemoteControlCallback(handleRemoteCommand);
  }, [handleRemoteCommand]);

  // Allowlist domain checker
  const handleShouldStartLoadWithRequest = (request: WebViewNavigation) => {
    const { url } = request;

    if (url === 'about:blank' || !url.startsWith('http')) {
      return true;
    }

    try {
      const parsedUrl = new URL(url);
      const isAllowed = ALLOWED_DOMAINS.some((domain) =>
        parsedUrl.hostname.includes(domain)
      );

      if (!isAllowed) {
        console.warn(`[Domain Restriction] Blocked navigation to: ${url}`);
        return false;
      }
      return true;
    } catch (e) {
      return true;
    }
  };

  // State sync from webview
  const handleOnMessage = async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      if (data.type === 'PLAYER_STATE' && isTrackPlayerReady && NativeModules.TrackPlayerModule) {
        const { isPlaying, title, artist, artwork, duration } = data.payload;
        const TP = require('react-native-track-player');
        const TrackPlayer = TP.default;
        const State = TP.State;

        await TrackPlayer.updateMetadataForTrack(0, {
          title: title || 'YouTube Music',
          artist: artist || 'Playing',
          artwork: artwork || 'https://music.youtube.com/img/favicon_144.png',
          duration: duration > 0 ? duration : 0,
        });

        const currentState = await TrackPlayer.getPlaybackState();
        if (isPlaying && currentState.state !== State.Playing) {
          await TrackPlayer.play();
        } else if (!isPlaying && currentState.state === State.Playing) {
          await TrackPlayer.pause();
        }
      }
    } catch (err) {
      // Ignore non-JSON messages
    }
  };

  const handleNavigationStateChange = (navState: WebViewNavigation) => {
    setCanGoBack(navState.canGoBack);
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(INJECTED_JAVASCRIPT);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <WebView
        ref={webViewRef}
        source={{ uri: 'https://music.youtube.com' }}
        userAgent={DESKTOP_USER_AGENT}
        style={styles.webview}
        // Background Media Playback & Audio Focus Configurations
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        allowsBackgroundMediaPlayback={true}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        domStorageEnabled={true}
        javaScriptEnabled={true}
        // Injected JS before & after content load for background & ad-blocking
        injectedJavaScriptBeforeContentLoaded={INJECTED_JAVASCRIPT}
        injectedJavaScript={INJECTED_JAVASCRIPT}
        onMessage={handleOnMessage}
        onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
        onNavigationStateChange={handleNavigationStateChange}
        onLoadStart={() => setIsLoading(true)}
        onLoadEnd={() => {
          setIsLoading(false);
          if (webViewRef.current) {
            webViewRef.current.injectJavaScript(INJECTED_JAVASCRIPT);
          }
        }}
        // Android performance options
        mixedContentMode="always"
        thirdPartyCookiesEnabled={true}
        originWhitelist={['https://*']}
      />

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#FF0000" />
          <Text style={styles.loadingText}>Loading YouTube Music...</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  webview: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    marginTop: 12,
    fontSize: 14,
    fontWeight: '500',
  },
});
