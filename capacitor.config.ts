import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.labourbook.app',
  appName: 'LabourBook',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#1656D6'
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true
    },
    LocalNotifications: {
      smallIcon: 'ic_launcher_round',
      iconColor: '#1656D6',
      sound: 'default'
    },
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '1027179208222-2hhdrgohaaa7ed068smm0tekptejq4k8.apps.googleusercontent.com',
      forceCodeForRefreshToken: true
    }
  }
};

export default config;
