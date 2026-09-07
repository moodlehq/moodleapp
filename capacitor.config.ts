import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.moodle.moodlemobile',
  appName: 'Moodle',
  webDir: 'www',
  appendUserAgent: 'MoodleMobile 5.3.0 (53000)',
  server: {
    hostname: 'localhost',
    androidScheme: 'http',
    iosScheme: 'moodleappfs',
  },
  cordova: {
    accessOrigins: ['*'],
    preferences: {
      permissions: 'none',
      orientation: 'default',
      'target-device': 'universal',
      fullscreen: 'false',
      'stay-in-webview': 'false',
      webviewbounce: 'false',
      UIWebViewBounce: 'false',
      DisallowOverscroll: 'true',
      'prerendered-icon': 'true',
      AppendUserAgent: 'MoodleMobile 5.3.0 (53000)',
      BackupWebStorage: 'none',
      ScrollEnabled: 'true',
      KeyboardDisplayRequiresUserAction: 'false',
      HideKeyboardFormAccessoryBar: 'false',
      KeyboardResizeMode: 'none',
      AllowInlineMediaPlayback: 'true',
      LoadUrlTimeoutValue: '60000',
      'load-url-timeout': '60000',
      AutoHideSplashScreen: 'false',
      'android-minSdkVersion': '24',
      'android-targetSdkVersion': '37',
      AndroidPersistentFileLocation: 'Compatibility',
      AndroidInsecureFileModeEnabled: 'false',
      CustomURLSchemePluginClearsAndroidIntent: 'true',
      'deployment-target': '15.0',
      iosPersistentFileLocation: 'Compatibility',
      scheme: 'http',
      iosScheme: 'moodleappfs',
      WKWebViewOnly: 'true',
      WKFullScreenEnabled: 'true',
      AndroidXEnabled: 'true',
      GradlePluginGoogleServicesEnabled: 'true',
      StatusBarOverlaysWebView: 'false',
      StatusBarBackgroundColor: '#FFFFFF',
      NavigationBarBackgroundColor: '#FFFFFF',
      AndroidEdgeToEdge: 'true'
    }
  }
};

export default config;
