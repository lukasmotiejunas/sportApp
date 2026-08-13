import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'lt.lumosport.member',
  appName: 'Lumo',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: '#0b0e18',
      showSpinner: false,
    },
    StatusBar: {
      overlaysWebView: false,
      style: 'DEFAULT',
      backgroundColor: '#0b0e18',
    },
  },
};

export default config;
