const { withOmittedEmptyXcodeValues } = require('./plugins/withMemorokuNative');

/** @type {import('expo/config').ExpoConfig} */
const config = {
  name: 'memoroku',
  slug: 'memoroku',
  scheme: 'memoroku',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  ios: {
    bundleIdentifier: 'com.memoroku',
    supportsTablet: true,
    infoPlist: {
      NSMicrophoneUsageDescription: 'Memoroku uses the microphone to record voice memos.',
      UIBackgroundModes: ['audio', 'processing'],
      BGTaskSchedulerPermittedIdentifiers: ['com.memoroku.cleanup'],
      NSAppTransportSecurity: {
        NSAllowsArbitraryLoads: true,
        NSAllowsLocalNetworking: true,
      },
    },
  },
  android: {
    package: 'com.memoroku',
    permissions: ['RECORD_AUDIO'],
    usesCleartextTraffic: true,
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      monochromeImage: './assets/monochrome-icon.png',
      backgroundColor: '#12aaa6',
    },
  },
  plugins: [
    [
      'expo-audio',
      {
        microphonePermission: 'Memoroku uses the microphone to record voice memos.',
        enableBackgroundPlayback: false,
        enableBackgroundRecording: false,
      },
    ],
    withOmittedEmptyXcodeValues,
    'expo-sqlite',
    ['expo-secure-store', { faceIDPermission: false }],
    'expo-notifications',
    [
      'expo-widgets',
      {
        bundleIdentifier: 'com.memoroku.ExpoWidgetsTarget',
        groupIdentifier: 'group.com.memoroku',
        widgets: [
          {
            name: 'MemoWidget',
            displayName: 'Memoroku',
            description: '最新の文字起こし',
            ios: {
              supportedFamilies: ['systemSmall', 'systemMedium'],
            },
          },
        ],
      },
    ],
    './plugins/withMemorokuNative',
  ],
};

module.exports = { expo: config };
