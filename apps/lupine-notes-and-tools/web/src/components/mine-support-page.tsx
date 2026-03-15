import { CssProps, HeaderWithBackFrame, SliderFrameHookProps } from 'lupine.components';

export const MineSupportContent = () => {
  const css: CssProps = {
    flex: 1,
    overflowY: 'auto',
    padding: '32px 24px',
    backgroundColor: 'var(--primary-bg-color)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',

    '.support-icon': {
      width: '80px',
      height: '80px',
      borderRadius: '40px',
      backgroundColor: 'var(--secondary-bg-color)',
      color: 'var(--primary-accent-color)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '40px',
      marginBottom: '24px',
    },
    '.support-title': {
      fontSize: '24px',
      fontWeight: 'bold',
      color: 'var(--primary-color)',
      marginBottom: '16px',
      textAlign: 'center',
    },
    '.support-content': {
      fontSize: '16px',
      color: 'var(--primary-color)',
      lineHeight: '1.8',
      textAlign: 'center',
      marginBottom: '32px',
      maxWidth: '500px',
      whiteSpace: 'pre-wrap',
    },
    '.support-link': {
      color: 'white',
      backgroundColor: 'var(--primary-accent-color)',
      textDecoration: 'none',
      fontWeight: 'bold',
      padding: '12px 32px',
      borderRadius: '24px',
      transition: 'all 0.2s',
      boxShadow: '0 4px 12px rgba(24, 144, 255, 0.3)',
      '&:active': {
        transform: 'scale(0.96)',
      },
    },
  };

  return (
    <div css={css} class='support-page-wrapper no-scrollbar-container flex-col h-100'>
      <div class='support-icon'>
        <i class='ifc-icon ma-text-box-outline'></i>
      </div>
      <div class='support-title'>Feedback & Support</div>

      <div class='support-content'>
        Thanks for trying out the Lupine Notes & Tools Demo! This application was built to showcase the rich
        capabilities of the open-source full-stack framework Lupine.js.
        <br />
        <br />
        If you find this interesting, feel free to visit our repository to explore more demos. Leaving a star would be
        highly appreciated and greatly encourage our work!
      </div>

      <a class='support-link' href='https://github.com/uuware/lupine.js' target='_blank'>
        View on GitHub
      </a>
    </div>
  );
};

export const MineSupportPage = (props: { sliderFrameHook?: SliderFrameHookProps }) => {
  return (
    <HeaderWithBackFrame title='Support' onBack={(e: Event) => props.sliderFrameHook?.close!(e)}>
      <MineSupportContent />
    </HeaderWithBackFrame>
  );
};
