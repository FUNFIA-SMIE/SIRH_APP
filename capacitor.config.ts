import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.ionic.starter',
  appName: 'SIRH FUNFIA',
  webDir: 'www',
  server: {
    androidScheme: 'https',
    cleartext: true
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_grey',
      iconColor: '#3b82f6',
      sound: 'default',
    },
    CapacitorHttp: {
      enabled: true
    }
  }
};

export default config;