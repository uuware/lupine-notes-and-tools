import { App } from '@capacitor/app';
import { backActionHelper, NotificationColor, NotificationMessage } from 'lupine.components';

const _saveApp = {
  lastBackTime: 0,
};

export const appListeners = () => {
  App.addListener('backButton', async (data) => {
    if (await backActionHelper.processBackAction()) {
      return;
    }

    if (Date.now() - _saveApp.lastBackTime < 1000) {
      App.exitApp();
      return;
    }

    // Is it the first button?
    NotificationMessage.sendMessage('Press again to exit the app.', NotificationColor.Info, false, 1000);
    _saveApp.lastBackTime = Date.now();
  });

  App.addListener('pause', () => {});
  App.addListener('resume', () => {});
};
