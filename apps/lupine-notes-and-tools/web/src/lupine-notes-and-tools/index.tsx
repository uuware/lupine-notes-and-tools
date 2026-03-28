// css order is important
import '../styles/global.css';
import '../styles/app.css';

import {
  bindRouter,
  PageRouter,
  bindTheme,
  bindLang,
  setDefaultPageTitle,
  isFrontEnd,
  debugWatch,
  webEnv,
  bindGlobalStyle,
} from 'lupine.components';
import { themes } from '../styles/theme';
import { baseCss } from '../styles/base-css';
import { AppResponsiveFrame } from '../frames/app-responsive-frame';
import { HomePage } from '../pages/home-page';
import { FinancePage } from '../pages/finance-page';
import { DiaryPage } from '../pages/diary-page';
import { MinePage } from '../pages/mine-page';
import { ToolsPage } from '../pages/tools-page';

if (isFrontEnd() && webEnv('NODE_ENV', '') === 'development') {
  debugWatch(webEnv('API_PORT', 0));
}

bindLang('zh-cn', {});
bindTheme('light', themes);
bindGlobalStyle('comm-css', baseCss, false, true);
setDefaultPageTitle('Lupine Notes and Tools');

const pageRouter = new PageRouter();
pageRouter.setFramePage({ component: AppResponsiveFrame, placeholderClassname: 'user-page-placeholder' });
pageRouter.setSubDir('/lupine-notes-and-tools');
pageRouter.use('/finance', FinancePage);
pageRouter.use('/diary', DiaryPage);
pageRouter.use('/mine', MinePage);
pageRouter.use('/tools', ToolsPage);
pageRouter.use('*', HomePage);

bindRouter(pageRouter);
