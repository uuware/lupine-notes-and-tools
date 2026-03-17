import {
  CssProps,
  HeaderWithBackFrame,
  HtmlVar,
  RefProps,
  SliderFrameHookProps,
  ActionSheetSelect,
  ToggleIcon,
  ToggleIconSize,
} from 'lupine.components';
import { FocusAnimation, ToolItem, LocalToolsService } from '../services/local-tools-service';

export const ToolsFocusPage = (props: {
  item: Partial<ToolItem>;
  sliderFrameHook: SliderFrameHookProps;
  onEdit?: (item: Partial<ToolItem>) => void;
  onDelete?: (id: string) => void;
}) => {
  const durationSec = (props.item.focus?.durationMinutes || 25) * 60;
  const savedSec = props.item.focus?.remainingSeconds;
  const animTheme: FocusAnimation = props.item.focus?.animationTheme || 'hourglass';

  // Resume from saved or start fresh
  let timeLeft = savedSec !== undefined && savedSec > 0 ? savedSec : durationSec;
  let timerId: any = null;
  let isCompleted = false;
  let isPaused = true; // savedSec !== undefined && savedSec > 0 && savedSec < durationSec;
  let wakeLock: any = null;

  const timeDom = new HtmlVar('');
  const centerAnimDom = new HtmlVar('');
  const controlsDom = new HtmlVar('');

  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLock = await (navigator as any).wakeLock.request('screen');
      }
    } catch (err) {
      console.warn('Wake Lock request failed:', err);
    }
  };

  const releaseWakeLock = async () => {
    if (wakeLock !== null) {
      await wakeLock.release();
      wakeLock = null;
    }
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const updateTimeUI = () => {
    if (isCompleted) {
      controlsDom.value = '';
      releaseWakeLock();
      timeDom.value = (
        <div class='focus-completed-text'>
          <h3>Focus Completed!</h3>
          <p>Great job staying focused for {props.item.focus?.durationMinutes} minutes.</p>
        </div>
      );
      centerAnimDom.value = (
        <div class='completed-icon'>
          <i class='ifc-icon ma-check-circle-outline' />
        </div>
      );
    } else {
      controlsDom.value = (
        <div class='focus-controls flex-center-center' style={{ marginTop: '24px' }}>
          <div class='flex-center-center' style={{ gap: '24px', flexDirection: 'row' }}>
            <div class='flex-center-center' style={{ flexDirection: 'column' }}>
              <ToggleIcon
                size={ToggleIconSize.LargeLarge}
                icon={<i class={`ifc-icon ${isPaused ? 'ma-play' : 'ma-pause'}`} />}
                checked={!isPaused}
                onClick={() => {
                  isPaused = !isPaused;
                  if (isPaused) {
                    if (timerId) clearInterval(timerId);
                    releaseWakeLock();
                  } else {
                    startTimer();
                  }
                  updateTimeUI();
                }}
              />
              <div style={{ marginTop: '8px', fontSize: '14px', color: 'var(--secondary-color)' }}>
                {isPaused ? 'Paused' : 'Focusing'}
              </div>
            </div>
            {/* Reset Button */}
            <div class='flex-center-center' style={{ flexDirection: 'column' }}>
              <ToggleIcon
                noToggle={true}
                size={ToggleIconSize.LargeLarge}
                icon={<i class='ifc-icon ma-refresh' />}
                onClick={() => {
                  if (timerId) clearInterval(timerId);
                  timeLeft = durationSec;
                  isCompleted = false;
                  isPaused = false;
                  updateTimeUI();
                  startTimer();
                }}
              />
              <div style={{ marginTop: '8px', fontSize: '14px', color: 'var(--secondary-color)' }}>Reset</div>
            </div>
          </div>
        </div>
      );
      timeDom.value = <div class='focus-time-display'>{formatTime(timeLeft)}</div>;
      renderAnimation(1 - timeLeft / durationSec); // pass progress 0 to 1
    }
  };

  const startTimer = () => {
    if (timerId) clearInterval(timerId);
    requestWakeLock();
    timerId = setInterval(() => {
      if (!isPaused && timeLeft > 0) {
        timeLeft--;
        updateTimeUI();
      } else if (timeLeft <= 0) {
        clearInterval(timerId);
        isCompleted = true;
        updateTimeUI();
      }
    }, 1000);
  };

  // Renders the animation reflecting the progress (0.0 = start, 1.0 = end)
  const renderAnimation = (progress: number) => {
    if (animTheme === 'hourglass') {
      const topHeight = Math.max(0, 100 - progress * 100);
      const bottomHeight = Math.min(100, progress * 100);

      centerAnimDom.value = (
        <div class='anim-hourglass-container'>
          <div class='hg-top'>
            <div class='hg-sand' style={{ height: `${topHeight}%` }}></div>
          </div>
          <div class='hg-middle'></div>
          <div class='hg-bottom'>
            <div class='hg-sand' style={{ height: `${bottomHeight}%` }}></div>
          </div>
        </div>
      );
    } else if (animTheme === 'candle') {
      const remainingHeight = Math.max(10, 100 - progress * 100);
      centerAnimDom.value = (
        <div class='anim-candle-container'>
          <div class='candle-flame'></div>
          <div class='candle-wick'></div>
          <div class='candle-body' style={{ height: `${remainingHeight}%` }}></div>
        </div>
      );
    } else if (animTheme === 'incense') {
      const remainingHeight = Math.max(0, 100 - progress * 100); // burns right to left or top to bottom
      centerAnimDom.value = (
        <div class='anim-incense-container'>
          <div class='incense-smoke'></div>
          <div class='incense-tip'></div>
          <div class='incense-body' style={{ height: `${remainingHeight}%` }}></div>
          <div class='incense-base'></div>
        </div>
      );
    }
  };

  const css: CssProps = {
    flex: 1,
    overflowY: 'auto',
    backgroundColor: 'var(--primary-bg-color)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '32px 16px',

    '.focus-title': {
      fontSize: '24px',
      fontWeight: 'bold',
      color: 'var(--primary-color)',
      marginBottom: '48px',
      textAlign: 'center',
    },

    '.focus-time-display': {
      fontSize: '64px',
      fontWeight: 'bold',
      color: 'var(--primary-accent-color)',
      fontFamily: 'monospace',
      marginTop: '48px',
    },

    '.focus-completed-text': {
      textAlign: 'center',
      marginTop: '48px',
      color: 'var(--primary-color)',
      h3: {
        fontSize: '24px',
        color: '#52c41a', // success green
        marginBottom: '8px',
      },
      p: {
        color: 'var(--secondary-color)',
      },
    },
    '.completed-icon': {
      fontSize: '120px',
      color: '#52c41a',
      marginTop: '24px',
      animation: 'popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
    },

    // Animations block
    '@keyframes flicker': {
      '0%': { transform: 'scale(1)', opacity: 0.9 },
      '50%': { transform: 'scale(1.1)', opacity: 1 },
      '100%': { transform: 'scale(0.95)', opacity: 0.8 },
    },
    '@keyframes floatSmoke': {
      '0%': { transform: 'translateY(0) scale(1) rotate(0deg)', opacity: 0.8 },
      '100%': { transform: 'translateY(-40px) scale(2) rotate(20deg)', opacity: 0 },
    },
    '@keyframes popIn': {
      '0%': { transform: 'scale(0)', opacity: 0 },
      '100%': { transform: 'scale(1)', opacity: 1 },
    },

    // Hourglass
    '.anim-hourglass-container': {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      width: '120px',
      height: '180px',
    },
    '.hg-top, .hg-bottom': {
      width: '100px',
      height: '80px',
      position: 'relative',
      border: '4px solid var(--primary-border-color)',
      overflow: 'hidden',
    },
    '.hg-top': {
      borderBottom: 'none',
      borderBottomLeftRadius: '50px',
      borderBottomRightRadius: '50px',
    },
    '.hg-bottom': {
      borderTop: 'none',
      borderTopLeftRadius: '50px',
      borderTopRightRadius: '50px',
    },
    '.hg-middle': {
      width: '12px',
      height: '12px',
      borderLeft: '4px solid var(--primary-border-color)',
      borderRight: '4px solid var(--primary-border-color)',
    },
    '.hg-sand': {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: '#faad14', // yellow sand
      transition: 'height 1s linear',
    },

    // Candle
    '.anim-candle-container': {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-end',
      width: '60px',
      height: '240px',
    },
    '.candle-flame': {
      width: '24px',
      height: '36px',
      backgroundColor: '#ff4d4f',
      borderRadius: '50% 50% 20% 20%',
      boxShadow: '0 -4px 16px #faad14, 0 -8px 24px #ff4d4f',
      animation: 'flicker 0.1s infinite alternate',
      marginBottom: '4px',
    },
    '.candle-wick': {
      width: '4px',
      height: '12px',
      backgroundColor: '#333',
    },
    '.candle-body': {
      width: '50px',
      backgroundColor: '#8c8c8c',
      border: '2px solid #a7a5a5',
      borderBottom: 'none',
      borderTopLeftRadius: '8px',
      borderTopRightRadius: '8px',
      transition: 'height 1s linear',
    },

    // Incense
    '.anim-incense-container': {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-end',
      width: '40px',
      height: '280px',
    },
    '.incense-smoke': {
      width: '12px',
      height: '40px',
      backgroundColor: 'var(--secondary-color)',
      borderRadius: '10px',
      filter: 'blur(4px)',
      animation: 'floatSmoke 2s infinite linear',
    },
    '.incense-tip': {
      width: '6px',
      height: '8px',
      backgroundColor: '#ff4d4f',
      borderRadius: '3px 3px 0 0',
      boxShadow: '0 -2px 8px #faad14',
    },
    '.incense-body': {
      width: '6px',
      backgroundColor: '#8c8c8c',
      transition: 'height 1s linear',
    },
    '.incense-base': {
      width: '24px',
      height: '12px',
      backgroundColor: '#d9d9d9',
      borderRadius: '12px 12px 0 0',
    },
    '.flex-center-center': {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
    },
  };

  const ref: RefProps = {
    onLoad: async () => {
      isPaused = false;
      startTimer();
      updateTimeUI();
    },
    onUnload: async () => {
      releaseWakeLock();
      if (!isCompleted && timeLeft > 0 && timeLeft < durationSec) {
        // Save intermediate state
        props.item.focus!.remainingSeconds = timeLeft;
        LocalToolsService.updateItem(props.item as ToolItem); // explicitly cast to save
      } else if (isCompleted || timeLeft === durationSec) {
        // Clear saved state if done or pristine
        props.item.focus!.remainingSeconds = undefined;
        LocalToolsService.updateItem(props.item as ToolItem); // explicitly cast to save
      }
    },
  };

  const onBack = (e: Event) => {
    releaseWakeLock();
    if (timerId) clearInterval(timerId);
    props.sliderFrameHook.close!(e);
  };

  const onEdit = () => {
    if (props.onEdit) props.onEdit(props.item);
  };

  const onDelete = async () => {
    await ActionSheetSelect.show({
      title: 'Delete this tool?',
      options: ['Delete'],
      cancelButtonText: 'Cancel',
      handleClicked: async (index: number, close: () => void) => {
        close();
        if (index === 0 && props.item.id) {
          LocalToolsService.deleteItem(props.item.id);
          if (props.onDelete) props.onDelete(props.item.id);
          props.sliderFrameHook.close!(new MouseEvent('click'));
        }
      },
    });
  };

  const pageRight = (
    <div class='flex-center-gap-12'>
      <i class='ifc-icon ma-pencil-outline icon-24-pointer' onClick={onEdit}></i>
      <i class='ifc-icon ma-delete-off-outline icon-24-pointer color-red' onClick={onDelete}></i>
    </div>
  );

  return (
    <HeaderWithBackFrame title='Focus Timer' onBack={onBack} right={pageRight}>
      <div css={css} ref={ref} class='focus-page-wrapper flex-col h-100'>
        <div class='focus-title'>{props.item.title}</div>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {centerAnimDom.node}
        </div>

        {controlsDom.node}
        {timeDom.node}
      </div>
    </HeaderWithBackFrame>
  );
};
