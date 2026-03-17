import { VNode } from 'lupine.web';
import { MediaQueryMaxWidth, ResponsiveFrame, SliderFrame, SliderFrameHookProps } from 'lupine.components';
import { SideMenuContent } from '../components/side-menu-content';
import { StorageManager } from '../services/cloud/storage-manager';
import { LoadingSpin } from '../components/loading-spin';

// Note: Replace with true site config loading if available
const getSiteTitle = async () => 'My Note App';
const getSiteFooter = async () => '© 2026 My Note App';

export const AppResponsiveFrame = async (placeholderClassname: string, vnode: VNode<any>) => {
  const mobileBottomMenu = [
    { icon: 'ma-home-outline', url: '/', text: 'Notes' },
    { icon: 'icon-finance', url: '/finance', text: 'Finance' },
    { icon: 'ma-book-outline', url: '/diary', text: 'Diary', topout: true },
    { icon: 'ma-tools', url: '/tools', text: 'Tools' },
    { icon: 'ma-account-cog-outline', url: '/mine', text: 'Mine' },
  ];

  const layout: 'sidebar' | 'tabs' = (localStorage.getItem('app-layout') as any) || 'tabs';
  const sliderFrameHook: SliderFrameHookProps = {};

  return ResponsiveFrame({
    placeholderClassname,
    mainContent: vnode,
    desktopHeaderTitle: await getSiteTitle(),
    desktopFooterTitle: await getSiteFooter(),
    desktopTopMenu: layout === 'sidebar' ? undefined : mobileBottomMenu,
    mobileBottomMenu: layout === 'sidebar' ? undefined : mobileBottomMenu,
    sharedContents: (
      <>
        <SliderFrame hook={sliderFrameHook} />
      </>
    ),
    mobileSideMenuContent: (
      <SideMenuContent
        navItems={layout === 'sidebar' ? mobileBottomMenu : undefined}
        settingSliderHook={sliderFrameHook}
        title='My Note App'
        footer='Powered by Lupine.js'
      />
    ),
    maxWidth: MediaQueryMaxWidth.DesktopMax,
    autoExtendSidemenu: layout === 'sidebar',
    onLoad: async () => {
      const closeLoading = await LoadingSpin.show();
      try {
        await StorageManager.initialize();
      } finally {
        closeLoading();
      }
    },
  });
};
