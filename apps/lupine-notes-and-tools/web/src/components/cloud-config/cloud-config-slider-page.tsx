import {
  HeaderWithBackFrame,
  CssProps,
  RefProps,
  Button,
  ButtonSize,
  SliderFrameHookProps,
  NotificationMessage,
  NotificationColor,
  ActionSheetMessage,
} from 'lupine.components';
import { bindGlobalStyle } from 'lupine.web';
import { Cascader } from 'lupine.components';
import { StorageManager } from '../../services/cloud/storage-manager';

// Global state cache for current session so inputs remain if navigating away and back without saving
const sessionState: any = {
  selectedProvider: null,
};

export const CloudConfigSliderPage = (props: { sliderFrameHook: SliderFrameHookProps }) => {
  const currentProvider = StorageManager.getActiveProvider().id;

  if (!sessionState.selectedProvider) {
    sessionState.selectedProvider = currentProvider;
  }

  const ref: RefProps = {};

  const selectProvider = (id: string) => {
    sessionState.selectedProvider = id;
    if (ref.$all) {
      ref.$all('.cloud-config-radio').forEach((el: any) => {
        if (el.dataset.provider === id) {
          el.classList.add('selected');
        } else {
          el.classList.remove('selected');
        }
      });
    }
  };

  const onSave = async () => {
    if (sessionState.selectedProvider === 'github') {
      const githubToken = ref.$('.github-token-input')?.value.trim();
      const githubOwner = ref.$('.github-owner-input')?.value.trim();
      const githubRepo = ref.$('.github-repo-input')?.value.trim();
      const githubPath = ref.$('.github-path-input')?.value.trim();

      if (!githubToken || !githubOwner || !githubRepo || !githubPath) {
        NotificationMessage.sendMessage('Please fill in all GitHub fields', NotificationColor.Warning);
        return;
      }
      localStorage.setItem('github_sync_token', githubToken);
      localStorage.setItem('github_sync_owner', githubOwner);
      localStorage.setItem('github_sync_repo', githubRepo);
      localStorage.setItem('github_sync_path', githubPath);
    } else if (sessionState.selectedProvider === 'dropbox') {
      const dbRefresh = ref.$('.dropbox-token-input')?.value.trim();
      const dbAccess = ref.$('.dropbox-access-input')?.value.trim();
      const dbKey = ref.$('.dropbox-key-input')?.value.trim();
      const dbSecret = ref.$('.dropbox-secret-input')?.value.trim();
      const dbPath = ref.$('.dropbox-path-input')?.value.trim();

      if (!dbPath) {
        NotificationMessage.sendMessage('Please specify a Sync Folder Path', NotificationColor.Warning);
        return;
      }
      if (!dbRefresh && !dbAccess) {
        NotificationMessage.sendMessage(
          'Please provide either an Access Token or a Refresh Token',
          NotificationColor.Warning
        );
        return;
      }

      localStorage.setItem('dropbox_sync_token', dbAccess);
      localStorage.setItem('dropbox_sync_refresh_token', dbRefresh);
      localStorage.setItem('dropbox_sync_app_key', dbKey);
      localStorage.setItem('dropbox_sync_app_secret', dbSecret);
      localStorage.setItem('dropbox_sync_path', dbPath);
    } else if (sessionState.selectedProvider === 'gdrive') {
      const gdToken = ref.$('.gdrive-token-input')?.value.trim();
      const gdAccess = ref.$('.gdrive-access-input')?.value.trim();
      const gdClient = ref.$('.gdrive-clientId-input')?.value.trim();
      const gdSecret = ref.$('.gdrive-secret-input')?.value.trim();
      const gdFolder = ref.$('.gdrive-folder-input')?.value.trim();

      if (!gdFolder) {
        NotificationMessage.sendMessage('Please specify a Root Folder ID', NotificationColor.Warning);
        return;
      }
      if (!gdToken && !gdAccess) {
        NotificationMessage.sendMessage(
          'Please provide either an Access Token or a Refresh Token',
          NotificationColor.Warning
        );
        return;
      }

      localStorage.setItem('gdrive_sync_token', gdAccess);
      localStorage.setItem('gdrive_sync_refresh_token', gdToken);
      localStorage.setItem('gdrive_sync_client_id', gdClient);
      localStorage.setItem('gdrive_sync_client_secret', gdSecret);
      localStorage.setItem('gdrive_sync_folder_id', gdFolder);
    } else if (sessionState.selectedProvider === 'onedrive') {
      const odToken = ref.$('.onedrive-token-input')?.value.trim();
      const odAccess = ref.$('.onedrive-access-input')?.value.trim();
      const odClient = ref.$('.onedrive-clientId-input')?.value.trim();
      const odPath = ref.$('.onedrive-path-input')?.value.trim();

      if (!odPath) {
        NotificationMessage.sendMessage('Please specify a Sync Folder Path', NotificationColor.Warning);
        return;
      }
      if (!odToken && !odAccess) {
        NotificationMessage.sendMessage(
          'Please provide either an Access Token or a Refresh Token',
          NotificationColor.Warning
        );
        return;
      }

      localStorage.setItem('onedrive_sync_token', odAccess);
      localStorage.setItem('onedrive_sync_refresh_token', odToken);
      localStorage.setItem('onedrive_sync_client_id', odClient);
      localStorage.setItem('onedrive_sync_path', odPath);
    } else if (sessionState.selectedProvider === 'local') {
      // no configs to save
    }

    try {
      const success = await StorageManager.switchProvider(sessionState.selectedProvider);
      if (success) {
        NotificationMessage.sendMessage(
          `Successfully connected to ${sessionState.selectedProvider}`,
          NotificationColor.Success
        );
        props.sliderFrameHook.close!(new CustomEvent('close'));
      } else {
        NotificationMessage.sendMessage(
          `Failed to connect to ${sessionState.selectedProvider}. Check credentials.`,
          NotificationColor.Error
        );
      }
    } catch (e: any) {
      console.error('Save error:', e);
      NotificationMessage.sendMessage(`Error saving provider: ${e.message}`, NotificationColor.Error);
    }
  };

  const onTestGitHub = async () => {
    const githubToken = ref.$('.github-token-input')?.value.trim();
    const githubOwner = ref.$('.github-owner-input')?.value.trim();
    const githubRepo = ref.$('.github-repo-input')?.value.trim();

    if (!githubToken || !githubOwner || !githubRepo) {
      NotificationMessage.sendMessage('Please fill in all GitHub fields to test connection', NotificationColor.Warning);
      return;
    }
    NotificationMessage.sendMessage(`Testing connection...`, NotificationColor.Success);
    try {
      const res = await fetch(`https://api.github.com/repos/${githubOwner}/${githubRepo}`, {
        headers: {
          Authorization: `token ${githubToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });
      if (res.ok) {
        NotificationMessage.sendMessage(`GitHub connection successful!`, NotificationColor.Success);
      } else {
        NotificationMessage.sendMessage(`GitHub connection failed: ${res.statusText}`, NotificationColor.Error);
      }
    } catch (e) {
      NotificationMessage.sendMessage(`GitHub connection failed: Network error`, NotificationColor.Error);
    }
  };

  const onTestDropbox = async () => {
    const dbRefresh = ref.$('.dropbox-token-input')?.value.trim();
    const dbAccess = ref.$('.dropbox-access-input')?.value.trim();
    const dbKey = ref.$('.dropbox-key-input')?.value.trim();
    const dbSecret = ref.$('.dropbox-secret-input')?.value.trim();

    if (!dbRefresh && !dbAccess) {
      NotificationMessage.sendMessage(
        'Please provide either an Access Token or a Refresh Token',
        NotificationColor.Warning
      );
      return;
    }

    let activeToken = dbAccess;

    if (!activeToken && dbRefresh) {
      if (!dbKey || !dbSecret) {
        NotificationMessage.sendMessage(
          'App Key and App Secret are required to use a Refresh Token',
          NotificationColor.Warning
        );
        return;
      }
      NotificationMessage.sendMessage(`Exchanging Refresh Token...`, NotificationColor.Success);
      try {
        const tokenRes = await fetch('https://api.dropbox.com/oauth2/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: dbRefresh,
            client_id: dbKey,
            client_secret: dbSecret,
          }),
        });
        if (tokenRes.ok) {
          const data = await tokenRes.json();
          activeToken = data.access_token;
        } else {
          const errText = await tokenRes.text();
          NotificationMessage.sendMessage(`Failed to refresh token: ${errText}`, NotificationColor.Error);
          return;
        }
      } catch (e) {
        NotificationMessage.sendMessage(`Network error during token refresh`, NotificationColor.Error);
        return;
      }
    }

    NotificationMessage.sendMessage(`Testing connection...`, NotificationColor.Success);
    try {
      const res = await fetch(`https://api.dropboxapi.com/2/users/get_current_account`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${activeToken}`,
        },
      });
      if (res.ok) {
        const body = await res.json();
        NotificationMessage.sendMessage(
          `Dropbox connection successful! App connected to: ${body.name?.display_name}`,
          NotificationColor.Success
        );
      } else {
        NotificationMessage.sendMessage(`Dropbox connection failed: ${res.statusText}`, NotificationColor.Error);
      }
    } catch (e) {
      NotificationMessage.sendMessage(`Dropbox connection failed: Network error`, NotificationColor.Error);
    }
  };

  const onTestGoogleDrive = async () => {
    const gdRefresh = ref.$('.gdrive-token-input')?.value.trim();
    const gdAccess = ref.$('.gdrive-access-input')?.value.trim();
    const gdClient = ref.$('.gdrive-clientId-input')?.value.trim();
    const gdSecret = ref.$('.gdrive-secret-input')?.value.trim();

    if (!gdRefresh && !gdAccess) {
      NotificationMessage.sendMessage(
        'Please provide either an Access Token or a Refresh Token',
        NotificationColor.Warning
      );
      return;
    }

    let activeToken = gdAccess;

    if (!activeToken && gdRefresh) {
      if (!gdClient || !gdSecret) {
        NotificationMessage.sendMessage(
          'Client ID and Secret are required to use a Refresh Token',
          NotificationColor.Warning
        );
        return;
      }
      NotificationMessage.sendMessage(`Exchanging Refresh Token...`, NotificationColor.Success);
      try {
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: gdClient,
            client_secret: gdSecret,
            refresh_token: gdRefresh,
            grant_type: 'refresh_token',
          }),
        });
        if (tokenRes.ok) {
          const data = await tokenRes.json();
          activeToken = data.access_token;
        } else {
          const errText = await tokenRes.text();
          NotificationMessage.sendMessage(`Failed to refresh token: ${errText}`, NotificationColor.Error);
          return;
        }
      } catch (e) {
        NotificationMessage.sendMessage(`Network error during token refresh`, NotificationColor.Error);
        return;
      }
    }

    NotificationMessage.sendMessage(`Testing connection...`, NotificationColor.Success);
    try {
      const res = await fetch(`https://www.googleapis.com/drive/v3/about?fields=user`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${activeToken}`,
        },
      });
      if (res.ok) {
        const body = await res.json();
        NotificationMessage.sendMessage(
          `Google Drive connection successful! Welcome, ${body.user?.displayName || 'User'}`,
          NotificationColor.Success
        );
      } else {
        NotificationMessage.sendMessage(`Google Drive connection failed: ${res.statusText}`, NotificationColor.Error);
      }
    } catch (e) {
      NotificationMessage.sendMessage(`Google Drive connection failed: Network error`, NotificationColor.Error);
    }
  };

  const onTestOneDrive = async () => {
    const odRefresh = ref.$('.onedrive-token-input')?.value.trim();
    const odAccess = ref.$('.onedrive-access-input')?.value.trim();
    const odClient = ref.$('.onedrive-clientId-input')?.value.trim();

    if (!odRefresh && !odAccess) {
      NotificationMessage.sendMessage(
        'Please provide either an Access Token or a Refresh Token',
        NotificationColor.Warning
      );
      return;
    }

    let activeToken = odAccess;

    if (!activeToken && odRefresh) {
      if (!odClient) {
        NotificationMessage.sendMessage('Client ID is required to use a Refresh Token', NotificationColor.Warning);
        return;
      }
      NotificationMessage.sendMessage(`Exchanging Refresh Token...`, NotificationColor.Success);
      try {
        const tokenRes = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: odClient,
            refresh_token: odRefresh,
            grant_type: 'refresh_token',
          }),
        });
        if (tokenRes.ok) {
          const data = await tokenRes.json();
          activeToken = data.access_token;
        } else {
          const errText = await tokenRes.text();
          NotificationMessage.sendMessage(`Failed to refresh token: ${errText}`, NotificationColor.Error);
          return;
        }
      } catch (e) {
        NotificationMessage.sendMessage(`Network error during token refresh`, NotificationColor.Error);
        return;
      }
    }

    NotificationMessage.sendMessage(`Testing connection...`, NotificationColor.Success);
    try {
      const res = await fetch(`https://graph.microsoft.com/v1.0/me`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${activeToken}`,
        },
      });
      if (res.ok) {
        const body = await res.json();
        NotificationMessage.sendMessage(
          `OneDrive connection successful! Welcome, ${body.displayName || 'User'}`,
          NotificationColor.Success
        );
      } else {
        NotificationMessage.sendMessage(`OneDrive connection failed: ${res.statusText}`, NotificationColor.Error);
      }
    } catch (e) {
      NotificationMessage.sendMessage(`OneDrive connection failed: Network error`, NotificationColor.Error);
    }
  };
  const showGDriveInstructions = () => {
    ActionSheetMessage.show({
      title: 'Google Drive OAuth Setup',
      confirmButtonText: 'Got it',
      closeWhenClickMessage: false,
      message: (
        <div style={{ width: '100%', textAlign: 'left', lineHeight: '1.6', fontSize: '14px' }}>
          <h3 style={{ marginTop: 0 }}>Google Drive OAuth Setup</h3>
          <p>
            We highly recommend the permanent <b>OAuth Client ID</b> method over short-lived Access Tokens.
          </p>
          <ol style={{ paddingLeft: '20px', margin: '0' }}>
            <li style={{ marginBottom: '8px' }}>
              Go to{' '}
              <a
                href='https://console.cloud.google.com/'
                target='_blank'
                style={{ color: 'var(--primary-accent-color)' }}
              >
                Google Cloud Console
              </a>{' '}
              and create a new Project.
            </li>
            <li style={{ marginBottom: '8px' }}>
              Navigate to <b>APIs & Services</b> &rarr; <b>Library</b>, search for <code>Google Drive API</code>, and
              click <b>Enable</b>.
            </li>
            <li style={{ marginBottom: '8px' }}>
              Go to <b>OAuth consent screen</b>, choose <b>External</b>, and fill the mandatory fields. <b>Crucial:</b>{' '}
              Add your own Google email to the <b>Test Users</b> list to bypass verification!
            </li>
            <li style={{ marginBottom: '8px' }}>
              Go to <b>Credentials</b> &rarr; <b>Create Credentials</b> &rarr; <b>OAuth client ID</b> (Web application).
              Add <code>https://developers.google.com/oauthplayground</code> to the <b>Authorized redirect URIs</b>.
              Copy your <b>Client ID</b> and <b>Client Secret</b>.
            </li>
            <li style={{ marginBottom: '8px' }}>
              Open{' '}
              <a
                href='https://developers.google.com/oauthplayground/'
                target='_blank'
                style={{ color: 'var(--primary-accent-color)' }}
              >
                Google OAuth Playground
              </a>
              . Click the tiny Settings gear at the top right, check "Use your own OAuth credentials", and insert your
              ID and Secret.
            </li>
            <li style={{ marginBottom: '8px' }}>
              In the Playground list, expand <code>Drive API v3</code>, check{' '}
              <code>https://www.googleapis.com/auth/drive.file</code>, and click <b>Authorize APIs</b>. Sign in with
              your test account.
            </li>
            <li style={{ marginBottom: '8px' }}>
              Click <b>Exchange authorization code for tokens</b>. Copy the resulting <b>Refresh Token</b> into Lupine!
            </li>
          </ol>
        </div>
      ),
    });
  };

  // const showOneDriveInstructions = () => {
  //   ActionSheetMessage.show({
  //     title: 'OneDrive OAuth Setup',
  //     confirmButtonText: 'Got it',
  //     closeWhenClickMessage: false,
  //     message: (
  //       <div style={{ width: '100%', textAlign: 'left', lineHeight: '1.6', fontSize: '14px' }}>
  //         <h3 style={{ marginTop: 0 }}>OneDrive OAuth Setup</h3>
  //         <p>
  //           We highly recommend the permanent <b>Refresh Token Flow</b> over short-lived Access Tokens.
  //         </p>
  //         <ol style={{ paddingLeft: '20px', margin: '0' }}>
  //           <li style={{ marginBottom: '8px' }}>
  //             Go to the{' '}
  //             <a
  //               href='https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade'
  //               target='_blank'
  //               style={{ color: 'var(--primary-accent-color)' }}
  //             >
  //               Azure App Registrations
  //             </a>{' '}
  //             portal and register a new application.
  //           </li>
  //           <li style={{ marginBottom: '8px' }}>
  //             Select "Accounts in any organizational directory and personal Microsoft accounts".
  //           </li>
  //           <li style={{ marginBottom: '8px' }}>
  //             Set a redirect URI (e.g., <code>http://localhost:3000</code>) under Single-page application or Web.
  //           </li>
  //           <li style={{ marginBottom: '8px' }}>
  //             Copy your <b>Application (client) ID</b> from the Overview page.
  //           </li>
  //           <li style={{ marginBottom: '8px' }}>
  //             Under <b>API permissions</b>, ensure you grant <code>Files.ReadWrite.All</code> and{' '}
  //             <code>offline_access</code>.
  //           </li>
  //           <li style={{ marginBottom: '8px' }}>
  //             Perform a standard OAuth2 flow (via Postman or a custom script) to exchange an authorization code for a
  //             Refresh Token.
  //           </li>
  //           <li style={{ marginBottom: '8px' }}>
  //             If you prefer not to use Refresh Tokens, you can generate a temporary Access Token from{' '}
  //             <a
  //               href='https://developer.microsoft.com/en-us/graph/graph-explorer'
  //               target='_blank'
  //               style={{ color: 'var(--primary-accent-color)' }}
  //             >
  //               Microsoft Graph Explorer
  //             </a>{' '}
  //             (by inspecting the network request token), but it will expire in 1 hour.
  //           </li>
  //         </ol>
  //       </div>
  //     ),
  //   });
  // };

  const renderInput = (label: string, value: string, placeholder: string, customClass: string, type = 'text') => (
    <div class='cloud-config-input-group'>
      <label class='cloud-config-input-label'>{label}</label>
      <input
        class={`input-base ${customClass} cloud-config-input-field`}
        type={type}
        placeholder={placeholder}
        value={value}
      />
    </div>
  );

  const renderCascaderTitle = (id: string, text: string) => (
    <div class='cloud-config-radio-container'>
      <div
        class={`cloud-config-radio ${sessionState.selectedProvider === id ? 'selected' : ''}`}
        data-provider={id}
        onClick={(e: Event) => {
          e.stopPropagation();
          selectProvider(id);
        }}
      >
        <div class='cloud-config-radio-inner'></div>
      </div>
      <span>{text}</span>
    </div>
  );

  const css: CssProps = {
    flex: 1,
    backgroundColor: 'var(--secondary-bg-color)',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    paddingBottom: '32px',

    '.&-intro-text': {
      color: 'var(--secondary-color)',
      fontSize: '14px',
      lineHeight: '1.5',
      margin: 0,
    },
    '.&-cascader-wrapper': {
      border: '1px solid var(--secondary-border-color)',
      borderRadius: '8px',
      overflow: 'hidden',
      backgroundColor: 'var(--primary-bg-color)',
    },
    '.&-cascader-desc': {
      color: 'var(--secondary-color)',
      fontSize: '13px',
    },
    '.cloud-config-input-group': {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      marginBottom: '16px',
    },
    '.cloud-config-input-label': {
      fontSize: '14px',
      color: 'var(--secondary-color)',
    },
    '.cloud-config-input-field': {
      width: '100%',
      boxSizing: 'border-box',
    },
    '.cloud-config-github-padding': {
      padding: '8px 0',
    },
    '.&-btn-container': {
      marginTop: '16px',
    },
    '.&-save-btn-container': {
      marginTop: '24px',
    },
    '.cloud-config-radio-container': {
      display: 'flex',
      alignItems: 'center',
    },
    '.cloud-config-radio': {
      width: '20px',
      height: '20px',
      minWidth: '20px',
      borderRadius: '50%',
      border: '2px solid var(--secondary-border-color)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: '12px',
      transition: 'border-color 0.2s',
      cursor: 'pointer',
    },
    '.cloud-config-radio.selected': {
      borderColor: 'var(--primary-accent-color)',
    },
    '.cloud-config-radio-inner': {
      width: '10px',
      height: '10px',
      borderRadius: '50%',
      backgroundColor: 'transparent',
      transition: 'background-color 0.2s',
    },
    '.cloud-config-radio.selected .cloud-config-radio-inner': {
      backgroundColor: 'var(--primary-accent-color)',
    },
  };

  return (
    <HeaderWithBackFrame title='Cloud Storage Configuration' onBack={(e) => props.sliderFrameHook.close!(e)}>
      <div ref={ref} css={css}>
        <p class='&-intro-text'>
          Select the storage provider where you want to keep your data synced. Different providers require different
          configurations.
        </p>

        <div class='&-cascader-wrapper'>
          <Cascader
            title={renderCascaderTitle('local', 'Local Storage (Offline)')}
            description='Keep data securely offline on this device only.'
            group='storage-providers'
            showCircle={true}
            defaultOpen={sessionState.selectedProvider === 'local'}
          >
            <p class='&-cascader-desc'>No further configuration required. Works completely offline.</p>
          </Cascader>

          <Cascader
            title={renderCascaderTitle('github', 'GitHub Repository')}
            description='Sync seamlessly across devices using a private GitHub repository.'
            group='storage-providers'
            showCircle={true}
            defaultOpen={sessionState.selectedProvider === 'github'}
          >
            <div class='cloud-config-github-padding'>
              <div
                style={{ fontSize: '13px', color: 'var(--secondary-color)', marginBottom: '16px', lineHeight: '1.5' }}
              >
                1. Go to{' '}
                <a
                  href='https://github.com/settings/tokens?type=beta'
                  target='_blank'
                  style={{ color: 'var(--primary-accent-color)', textDecoration: 'none' }}
                >
                  GitHub Settings &rarr; Tokens
                </a>{' '}
                and generate a new token.
                <br />
                2. Grant it <b>Read and Write</b> access to <b>Contents</b>.<br />
                3. Create an empty private repository manually to store the data.
              </div>
              {renderInput(
                'Personal Access Token',
                localStorage.getItem('github_sync_token') || '',
                'github_pat_...',
                'github-token-input',
                'password'
              )}
              {renderInput(
                'Repository Owner (Username)',
                localStorage.getItem('github_sync_owner') || '',
                'e.g. torvalds',
                'github-owner-input'
              )}
              {renderInput(
                'Repository Name',
                localStorage.getItem('github_sync_repo') || '',
                'e.g. my-private-notes',
                'github-repo-input'
              )}
              {renderInput(
                'Sync Folder Path',
                localStorage.getItem('github_sync_path') || 'lupine_data_v2',
                'e.g. lupine_data_v2',
                'github-path-input'
              )}
              <div class='&-btn-container'>
                <Button
                  text='Test GitHub Connection'
                  size={ButtonSize.Small}
                  onClick={onTestGitHub}
                  css={{
                    width: '100%',
                    justifyContent: 'center',
                    backgroundColor: 'var(--secondary-bg-color)',
                    color: 'var(--primary-color)',
                  }}
                />
              </div>
            </div>
          </Cascader>

          <Cascader
            title={renderCascaderTitle('dropbox', 'Dropbox')}
            description='Sync seamlessly across devices using your personal Dropbox.'
            group='storage-providers'
            showCircle={true}
            defaultOpen={sessionState.selectedProvider === 'dropbox'}
          >
            <div class='cloud-config-github-padding'>
              <div
                style={{ fontSize: '13px', color: 'var(--secondary-color)', marginBottom: '16px', lineHeight: '1.5' }}
              >
                1. Go to the{' '}
                <a
                  href='https://www.dropbox.com/developers/apps'
                  target='_blank'
                  style={{ color: 'var(--primary-accent-color)', textDecoration: 'none' }}
                >
                  Dropbox App Console
                </a>{' '}
                and create a "Scoped App".
                <br />
                2. Go to the <b>Permissions</b> tab and enable <code>files.content.read</code> and{' '}
                <code>files.content.write</code>.<br />
                3. Go to the <b>Settings</b> tab, look under <b>OAuth 2</b>. Leave "Access token expiration" as short-lived.<br />
                4. Add <code>http://localhost:3000</code> to <b>Redirect URIs</b>.<br />
                5. Get your <b>Refresh Token</b> via the OAuth flow (or by generating an access token with offline access).
              </div>
              <div
                style={{
                  borderLeft: '3px solid var(--primary-accent-color)',
                  paddingLeft: '12px',
                  marginBottom: '16px',
                }}
              >
                <div
                  style={{ fontSize: '12px', color: 'var(--secondary-color)', marginBottom: '8px', fontWeight: 'bold' }}
                >
                  Permanent Setup (Refresh Token Flow)
                </div>
                {renderInput(
                  'App Key',
                  localStorage.getItem('dropbox_sync_app_key') || '',
                  'Your Dropbox App Key',
                  'dropbox-key-input'
                )}
                {renderInput(
                  'App Secret',
                  localStorage.getItem('dropbox_sync_app_secret') || '',
                  'Your Dropbox App Secret',
                  'dropbox-secret-input',
                  'password'
                )}
                {renderInput(
                  'Refresh Token',
                  localStorage.getItem('dropbox_sync_refresh_token') || '',
                  'Your offline Refresh Token',
                  'dropbox-token-input',
                  'password'
                )}
              </div>

              <div
                style={{
                  borderLeft: '3px solid var(--secondary-border-color)',
                  paddingLeft: '12px',
                  marginBottom: '16px',
                }}
              >
                <div
                  style={{ fontSize: '12px', color: 'var(--secondary-color)', marginBottom: '8px', fontWeight: 'bold' }}
                >
                  Short-lived Setup (4 Hour Expiry)
                </div>
                {renderInput(
                  'Generated Access Token',
                  localStorage.getItem('dropbox_sync_token') || '',
                  'sl.B...',
                  'dropbox-access-input',
                  'password'
                )}
              </div>
              {renderInput(
                'Sync Folder Path',
                localStorage.getItem('dropbox_sync_path') || '/lupine_data_v2',
                'e.g. /lupine_data_v2',
                'dropbox-path-input'
              )}
              <div class='&-btn-container'>
                <Button
                  text='Test Dropbox Connection'
                  size={ButtonSize.Small}
                  onClick={onTestDropbox}
                  css={{
                    width: '100%',
                    justifyContent: 'center',
                    backgroundColor: 'var(--secondary-bg-color)',
                    color: 'var(--primary-color)',
                  }}
                />
              </div>
            </div>
          </Cascader>

          <Cascader
            title={renderCascaderTitle('gdrive', 'Google Drive')}
            description='Sync securely to a specific folder in your Google Drive.'
            group='storage-providers'
            showCircle={true}
            defaultOpen={sessionState.selectedProvider === 'gdrive'}
          >
            <div class='cloud-config-github-padding'>
              <div
                style={{
                  fontSize: '13px',
                  color: 'var(--primary-accent-color)',
                  marginBottom: '16px',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
                onClick={showGDriveInstructions}
              >
                How to setup permanent OAuth sync? (Recommended)
              </div>
              <div
                style={{
                  borderLeft: '3px solid var(--primary-accent-color)',
                  paddingLeft: '12px',
                  marginBottom: '16px',
                }}
              >
                <div
                  style={{ fontSize: '12px', color: 'var(--secondary-color)', marginBottom: '8px', fontWeight: 'bold' }}
                >
                  Permanent Setup (Recommended)
                </div>
                {renderInput(
                  'Client ID',
                  localStorage.getItem('gdrive_sync_client_id') || '',
                  'Your GCP Client ID',
                  'gdrive-clientId-input'
                )}
                {renderInput(
                  'Client Secret',
                  localStorage.getItem('gdrive_sync_client_secret') || '',
                  'Your GCP Client Secret',
                  'gdrive-secret-input',
                  'password'
                )}
                {renderInput(
                  'Refresh Token',
                  localStorage.getItem('gdrive_sync_refresh_token') || '',
                  '1//04...',
                  'gdrive-token-input',
                  'password'
                )}
              </div>

              <div
                style={{
                  borderLeft: '3px solid var(--secondary-border-color)',
                  paddingLeft: '12px',
                  marginBottom: '16px',
                }}
              >
                <div
                  style={{ fontSize: '12px', color: 'var(--secondary-color)', marginBottom: '8px', fontWeight: 'bold' }}
                >
                  Short-lived Setup (1 Hour Expiry)
                </div>
                {renderInput(
                  'Temporary Access Token',
                  localStorage.getItem('gdrive_sync_token') || '',
                  'ya29.a0...',
                  'gdrive-access-input',
                  'password'
                )}
              </div>

              {renderInput(
                'Root Folder ID',
                localStorage.getItem('gdrive_sync_folder_id') || '',
                'e.g. 1kZ8abcXyz...',
                'gdrive-folder-input'
              )}
              <div class='&-btn-container'>
                <Button
                  text='Test Google Drive Connection'
                  size={ButtonSize.Small}
                  onClick={onTestGoogleDrive}
                  css={{
                    width: '100%',
                    justifyContent: 'center',
                    backgroundColor: 'var(--secondary-bg-color)',
                    color: 'var(--primary-color)',
                  }}
                />
              </div>
            </div>
          </Cascader>

          {/* It's impossible to use OneDrive for now because it requires a refresh token, which is not possible to obtain without a desktop app */}
          {/* <Cascader
            title={renderCascaderTitle('onedrive', 'OneDrive')}
            description='Sync your files directly to your personal OneDrive account.'
            group='storage-providers'
            showCircle={true}
            defaultOpen={sessionState.selectedProvider === 'onedrive'}
          >
            <div class='cloud-config-github-padding'>
              <div
                style={{
                  fontSize: '13px',
                  color: 'var(--primary-accent-color)',
                  marginBottom: '16px',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
                onClick={showOneDriveInstructions}
              >
                How to setup permanent OAuth sync? (Recommended)
              </div>
              <div
                style={{
                  borderLeft: '3px solid var(--primary-accent-color)',
                  paddingLeft: '12px',
                  marginBottom: '16px',
                }}
              >
                <div
                  style={{ fontSize: '12px', color: 'var(--secondary-color)', marginBottom: '8px', fontWeight: 'bold' }}
                >
                  Permanent Setup (Refresh Token Flow)
                </div>
                {renderInput(
                  'Client ID',
                  localStorage.getItem('onedrive_sync_client_id') || '',
                  'Your Azure App Client ID',
                  'onedrive-clientId-input'
                )}
                {renderInput(
                  'Refresh Token',
                  localStorage.getItem('onedrive_sync_refresh_token') || '',
                  'OAQABAAAA...',
                  'onedrive-token-input',
                  'password'
                )}
              </div>

              <div
                style={{
                  borderLeft: '3px solid var(--secondary-border-color)',
                  paddingLeft: '12px',
                  marginBottom: '16px',
                }}
              >
                <div
                  style={{ fontSize: '12px', color: 'var(--secondary-color)', marginBottom: '8px', fontWeight: 'bold' }}
                >
                  Short-lived Setup (Access Token)
                </div>
                {renderInput(
                  'Temporary Access Token',
                  localStorage.getItem('onedrive_sync_token') || '',
                  'EwBAA...',
                  'onedrive-access-input',
                  'password'
                )}
              </div>

              {renderInput(
                'Sync Folder Path',
                localStorage.getItem('onedrive_sync_path') || 'lupine_data_v2',
                'e.g. lupine_data_v2',
                'onedrive-path-input'
              )}

              <div class='&-btn-container'>
                <Button
                  text='Test OneDrive Connection'
                  size={ButtonSize.Small}
                  onClick={onTestOneDrive}
                  css={{
                    width: '100%',
                    justifyContent: 'center',
                    backgroundColor: 'var(--secondary-bg-color)',
                    color: 'var(--primary-color)',
                  }}
                />
              </div>
            </div>
          </Cascader> */}
        </div>

        <div class='&-save-btn-container'>
          <Button
            text='Save and Connect'
            size={ButtonSize.Medium}
            onClick={onSave}
            css={{ width: '100%', justifyContent: 'center' }}
          />
        </div>
      </div>
    </HeaderWithBackFrame>
  );
};
