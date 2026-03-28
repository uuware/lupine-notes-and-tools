import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.uuware.lupinenotesandtools',
  appName: 'Lupine Notes',
  webDir: '../../../dist/server_root/lupine-notes-and-tools_web',
  plugins: {
    SplashScreen: {
      backgroundColor: '#ffffff',
      showSpinner: false,
      launchFadeOutDuration: 300,
    }
  }
};

export default config;
