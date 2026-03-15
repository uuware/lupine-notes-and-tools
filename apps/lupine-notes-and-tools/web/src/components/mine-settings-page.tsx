import {
  ActionSheetSelect,
  CssProps,
  HeaderWithBackFrame,
  HtmlVar,
  NotificationColor,
  NotificationMessage,
  RefProps,
  SliderFrame,
  SliderFrameHookProps,
  ToggleSwitch,
  ToggleSwitchSize,
} from 'lupine.components';
import { MineService } from '../services/mine-service';
import { MineAboutPage } from './mine-about-page';
import { MineSupportPage } from './mine-support-page';

export const MineSettingsPage = (props: { sliderFrameHook: SliderFrameHookProps; onDataChanged: () => void }) => {
  const innerSliderHook: SliderFrameHookProps = {};

  const onExport = () => {
    const dataStr = MineService.exportBackup();
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lupine_backup_${new Date().getTime()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const onImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        if (content) {
          const success = MineService.importBackup(content);
          if (success) {
            NotificationMessage.sendMessage('Data imported successfully!', NotificationColor.Success);
            props.onDataChanged();
          } else {
            NotificationMessage.sendMessage('Failed to parse backup file.', NotificationColor.Error);
          }
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const onClearAll = async () => {
    await ActionSheetSelect.show({
      title: 'DANGER: Are you sure you want to permanently delete ALL local data? This cannot be undone.',
      options: ['Erase Everything'],
      cancelButtonText: 'Cancel',
      handleClicked: async (index: number, close: () => void) => {
        close();
        if (index === 0) {
          MineService.clearAllData();
          props.onDataChanged();
        }
      },
    });
  };

  const onClearCache = async () => {
    // Fake mock loading for UX
    const loader = document.createElement('div');
    loader.style.position = 'fixed';
    loader.style.top = '50%';
    loader.style.left = '50%';
    loader.style.transform = 'translate(-50%, -50%)';
    loader.style.background = 'rgba(0,0,0,0.8)';
    loader.style.color = '#fff';
    loader.style.padding = '16px 24px';
    loader.style.borderRadius = '8px';
    loader.style.zIndex = '9999';
    loader.innerText = 'Clearing cache...';
    document.body.appendChild(loader);

    setTimeout(() => {
      document.body.removeChild(loader);
      NotificationMessage.sendMessage('Cache cleared.', NotificationColor.Success);
    }, 800);
  };

  const renderContent = () => {
    const css: CssProps = {
      display: 'flex',
      flexDirection: 'column',
      flex: '1',
      padding: '0 16px',
      backgroundColor: 'var(--secondary-bg-color)',
      overflowY: 'auto',

      '.setting-section-group': {
        marginBottom: '24px',
      },
      '.setting-section-title': {
        fontSize: '14px',
        color: 'var(--secondary-color)',
        marginBottom: '8px',
        paddingLeft: '16px',
        marginTop: '16px',
      },
      '.setting-section-block': {
        backgroundColor: 'var(--primary-bg-color)',
        borderRadius: '12px',
        overflow: 'hidden',
      },
      '.setting-section-item': {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px',
        borderBottom: '1px solid var(--primary-border-color)',
        cursor: 'pointer',
        transition: 'background-color 0.2s',
      },
      '.setting-section-item:last-child': {
        borderBottom: 'none',
      },
      '.setting-section-item:active': {
        backgroundColor: 'rgba(0,0,0,0.02)',
      },
      '.setting-section-item-text': {
        fontSize: '16px',
        color: 'var(--primary-color)',
      },
      '.setting-section-item-text.danger': {
        color: '#ff4d4f',
      },
      '.setting-section-item-icon': {
        color: 'var(--secondary-color)',
        opacity: 0.5,
      },
      'a.setting-section-item': {
        textDecoration: 'none',
      },
    };

    const ref: RefProps = {
      onLoad: async (el: Element) => {
        // any sub loaders
      },
    };

    return (
      <div css={css} ref={ref} class='user-settings-top'>
        <div class='setting-section-group'>
          <div class='setting-section-title'>App Layout</div>
          <div class='setting-section-block'>
            <div class='setting-section-item'>
              <div class='setting-section-item-text'>
                <div style={{ fontWeight: 'bold' }}>Desktop Menu</div>
                <div style={{ fontSize: '14px', color: 'var(--secondary-color)', marginTop: '4px' }}>
                  {(localStorage.getItem('app-layout') || 'tabs') === 'sidebar' ? 'Sidebar Menu' : 'Bottom Tabs'}
                </div>
              </div>
              <div class='setting-section-item-icon' style={{ opacity: 1 }}>
                <ToggleSwitch
                  size={ToggleSwitchSize.Medium}
                  checked={(localStorage.getItem('app-layout') || 'tabs') === 'sidebar'}
                  disabled={false}
                  onClick={async (v) => {
                    const newLayout = v ? 'sidebar' : 'tabs';
                    localStorage.setItem('app-layout', newLayout);
                    dom.value = renderContent(); // Re-render first

                    await ActionSheetSelect.show({
                      title: 'Layout changed. Restart app to apply?',
                      options: ['Restart Now'],
                      cancelButtonText: 'Later',
                      handleClicked: async (index: number, close: () => void) => {
                        close();
                        if (index === 0) {
                          window.location.href = '/';
                        }
                      },
                    });
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div class='setting-section-group'>
          <div class='setting-section-title'>Data Backup</div>
          <div class='setting-section-block'>
            <div class='setting-section-item' onClick={onExport}>
              <div class='setting-section-item-text'>Export Data Backup (JSON)</div>
              <div class='setting-section-item-icon'>
                <i class='ifc-icon ma-download' />
              </div>
            </div>
            <div class='setting-section-item' onClick={onImport}>
              <div class='setting-section-item-text'>Import Data (JSON)</div>
              <div class='setting-section-item-icon'>
                <i class='ifc-icon ma-upload' />
              </div>
            </div>
          </div>
        </div>

        <div class='setting-section-group'>
          <div class='setting-section-title'>Application</div>
          <div class='setting-section-block'>
            <a
              class='setting-section-item'
              href='javascript:void(0)'
              onClick={() => {
                innerSliderHook.load!(<MineSupportPage sliderFrameHook={innerSliderHook} />);
              }}
            >
              <div class='setting-section-item-text'>Feedback & Support</div>
              <div class='setting-section-item-icon'>
                <i class='ifc-icon ma-chevron-right' />
              </div>
            </a>
            <div class='setting-section-item' onClick={onClearCache}>
              <div class='setting-section-item-text'>Clear Temporary Cache</div>
              <div class='setting-section-item-icon'>
                <i class='ifc-icon ma-chevron-right' />
              </div>
            </div>
            <div
              class='setting-section-item'
              onClick={() => {
                // props.sliderFrameHook.addClass!('desktop-slide-left');
                // innerSliderHook.addClass!('desktop-slide-right');
                innerSliderHook.load!(<MineAboutPage sliderFrameHook={innerSliderHook} />);
              }}
            >
              <div class='setting-section-item-text'>About</div>
              <div class='setting-section-item-icon'>
                <i class='ifc-icon ma-chevron-right' />
              </div>
            </div>
          </div>
        </div>

        <div class='setting-section-group'>
          <div class='setting-section-title text-danger'>Danger Zone</div>
          <div class='setting-section-block'>
            <div class='setting-section-item' onClick={onClearAll}>
              <div class='setting-section-item-text danger'>Clear All Application Data</div>
              <div class='setting-section-item-icon'>
                <i class='ifc-icon ma-delete-outline text-danger' />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const dom = new HtmlVar(renderContent());

  return (
    <HeaderWithBackFrame title='Settings' onBack={(event) => props.sliderFrameHook.close!(event)}>
      <>
        <SliderFrame hook={innerSliderHook} />
        {dom.node}
      </>
    </HeaderWithBackFrame>
  );
};
