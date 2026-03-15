import {
  ActionSheetSelect,
  CssProps,
  HeaderWithBackFrame,
  HtmlVar,
  NotificationColor,
  NotificationMessage,
  RefProps,
  SliderFrameHookProps,
  ActionSheetColorPicker,
  ActionSheetDatePicker,
  MobileHeaderTitleIcon,
  PageProps,
  ToggleIcon,
  ToggleIconSize,
  MobileHeaderEmptyIcon,
  ActionSheetSelectWrapPromise,
  ActionSheetTimePicker,
} from 'lupine.components';
import {
  DaysMatterCycle,
  FocusAnimation,
  LocalToolsService,
  ToolItem,
  ToolType,
  TOOL_CATEGORIES,
} from '../services/local-tools-service';

export const ToolsEditPage = (props: {
  item?: ToolItem;
  sliderFrameHook: SliderFrameHookProps;
  onSaved: () => void;
}) => {
  const isEdit = !!props.item;

  // Shared state via HtmlVars for instant re-renders in conditional logic
  let type: ToolType = props.item?.type || 'days_matter';
  let title: string = props.item?.title || '';
  let color: string = props.item?.color || '';

  // Type-specific states
  let dmCycle: DaysMatterCycle = props.item?.daysMatter?.cycle || 'one-off';
  let dmDate: string = props.item?.daysMatter?.targetDate || '';

  let todoDesc: string = props.item?.todo?.description || '';

  let focusDuration: number = props.item?.focus?.durationMinutes || 25;
  let focusAnim: FocusAnimation = props.item?.focus?.animationTheme || 'hourglass';

  // HtmlVars to trigger rebuilds of the specific input zones
  const typeDom = new HtmlVar(TOOL_CATEGORIES.find((c) => c.id === type)?.label || '');
  const bodyFieldsDom = new HtmlVar('');
  const colorDom = new HtmlVar('');

  const pickType = () => {
    if (isEdit) return; // Disallow changing tool type once created
    const labels = TOOL_CATEGORIES.map((c) => c.label);
    ActionSheetSelect.show({
      title: 'Select Tool Type',
      options: labels,
      cancelButtonText: 'Cancel',
      handleClicked: async (idx, close) => {
        close();
        const cat = TOOL_CATEGORIES[idx];
        type = cat.id;
        typeDom.value = cat.label;
        renderBodyFields();
      },
    });
  };

  const pickColor = async () => {
    const res = await ActionSheetColorPicker({
      title: 'Select Color Tag',
      value: color,
    });
    if (res !== undefined) {
      color = res;
      renderColorDot();
    }
  };

  const renderColorDot = () => {
    colorDom.value = <div class='color-preview-box' style={{ backgroundColor: color || 'transparent' }}></div>;
  };

  const pickCycle = () => {
    const cycles: DaysMatterCycle[] = ['one-off', 'monthly', 'yearly'];
    const labels = ['One-off', 'Monthly', 'Yearly'];
    ActionSheetSelect.show({
      title: 'Repeat Cycle',
      options: labels,
      cancelButtonText: 'Cancel',
      handleClicked: async (idx, close) => {
        close();
        dmCycle = cycles[idx];
        renderBodyFields();
      },
    });
  };

  const pickAnim = () => {
    const anims: FocusAnimation[] = ['hourglass', 'candle', 'incense'];
    const labels = ['Hourglass', 'Candle', 'Incense'];
    ActionSheetSelect.show({
      title: 'Animation Theme',
      options: labels,
      cancelButtonText: 'Cancel',
      handleClicked: async (idx, close) => {
        close();
        focusAnim = anims[idx];
        renderBodyFields();
      },
    });
  };

  const pickDate = async () => {
    if (dmCycle === 'monthly') {
      const days = Array.from({ length: 31 }, (_, i) => String(i + 1));
      const result = await ActionSheetSelectWrapPromise({
        title: 'Select a Day',
        options: days,
      });
      if (result >= 0) {
        dmDate = days[result];
        renderBodyFields();
      }
    } else if (dmCycle === 'yearly') {
      const res = await ActionSheetDatePicker({
        title: 'Target Date',
        value: dmDate || '01-01',
        format: 'MD',
      });
      if (res) {
        dmDate = res;
        renderBodyFields();
      }
    } else {
      const res = await ActionSheetDatePicker({
        title: 'Target Date',
        value: dmDate || new Date().toISOString().split('T')[0],
        format: 'YMD',
      });
      if (res) {
        dmDate = res;
        renderBodyFields();
      }
    }
  };

  const renderBodyFields = () => {
    let fields = <></>;

    if (type === 'days_matter') {
      fields = (
        <>
          <div class='tool-prop-row' onClick={pickCycle}>
            <div class='prop-label'>Repeat Cycle</div>
            <div class='prop-value'>
              {dmCycle === 'one-off' ? 'One-off' : dmCycle === 'monthly' ? 'Monthly' : 'Yearly'}
              <i class='ifc-icon ma-chevron-right icon-14' style={{ marginLeft: '4px' }} />
            </div>
          </div>
          <div class='tool-prop-row' onClick={pickDate}>
            <div class='prop-label'>Target Date</div>
            <div class='prop-value'>
              {dmDate || 'Select Date'}
              <i class='ifc-icon ma-chevron-right icon-14' style={{ marginLeft: '4px' }} />
            </div>
          </div>
        </>
      );
    } else if (type === 'todo') {
      fields = (
        <div class='tool-section'>
          <div class='prop-label' style={{ padding: '0 16px 8px 16px' }}>
            Description
          </div>
          <textarea
            class='input-base todo-desc-input'
            placeholder='Add more details...'
            onChange={(e) => (todoDesc = (e.target as HTMLTextAreaElement).value)}
          >
            {todoDesc}
          </textarea>
        </div>
      );
    } else if (type === 'focus') {
      fields = (
        <>
          <div
            class='tool-prop-row'
            onClick={async () => {
              const h = Math.floor(focusDuration / 60)
                .toString()
                .padStart(2, '0');
              const m = (focusDuration % 60).toString().padStart(2, '0');
              const result = await ActionSheetTimePicker({
                title: 'Pick duration (HH:mm)',
                value: `${h}:${m}`,
                showSeconds: false,
              });
              if (result) {
                const parts = result.split(':');
                if (parts.length >= 2) {
                  const newMins = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
                  if (newMins > 0) {
                    focusDuration = newMins;
                    renderBodyFields();
                  }
                }
              }
            }}
          >
            <div class='prop-label'>Duration</div>
            <div class='prop-value'>
              {focusDuration} Minute(s)
              <i class='ifc-icon ma-chevron-right icon-14' style={{ marginLeft: '4px' }} />
            </div>
          </div>
          <div class='tool-prop-row' onClick={pickAnim}>
            <div class='prop-label'>Animation Theme</div>
            <div class='prop-value'>
              {focusAnim.charAt(0).toUpperCase() + focusAnim.slice(1)}
              <i class='ifc-icon ma-chevron-right icon-14' style={{ marginLeft: '4px' }} />
            </div>
          </div>
        </>
      );
    }
    // 'habit' needs no extra fields

    bodyFieldsDom.value = fields;
  };

  const onSave = () => {
    title = (ref.current?.querySelector('.title-input') as HTMLInputElement)?.value.trim() || title;

    if (!title) {
      NotificationMessage.sendMessage('Title cannot be empty', NotificationColor.Error);
      return;
    }

    if (type === 'days_matter') {
      if (!dmDate) {
        NotificationMessage.sendMessage('Please select a target date', NotificationColor.Error);
        return;
      }
      const parts = dmDate.split('-');
      if (dmCycle === 'one-off' && parts.length !== 3) {
        NotificationMessage.sendMessage('For One-off, please select Year, Month, and Day', NotificationColor.Error);
        return;
      }
      if (dmCycle === 'yearly' && parts.length !== 2) {
        NotificationMessage.sendMessage('For Yearly, please select Month and Day', NotificationColor.Error);
        return;
      }
      if (dmCycle === 'monthly' && parts.length !== 1) {
        NotificationMessage.sendMessage('For Monthly, please select Day only', NotificationColor.Error);
        return;
      }
    }

    const newItem: ToolItem = {
      id: isEdit ? props.item!.id : Date.now().toString(),
      sortIndex: isEdit ? props.item!.sortIndex : 0,
      type,
      title,
      color,
    };

    if (type === 'days_matter') {
      newItem.daysMatter = { cycle: dmCycle, targetDate: dmDate || new Date().toISOString().split('T')[0] };
    } else if (type === 'todo') {
      newItem.todo = { description: todoDesc, isCompleted: isEdit ? props.item!.todo!.isCompleted : false };
    } else if (type === 'habit') {
      newItem.habit = isEdit ? props.item!.habit : { checkInDates: [] };
    } else if (type === 'focus') {
      newItem.focus = { durationMinutes: focusDuration, animationTheme: focusAnim };
    }

    if (isEdit) {
      LocalToolsService.updateItem(newItem);
    } else {
      LocalToolsService.addItem(newItem);
    }

    props.onSaved();
    props.sliderFrameHook.close!(new Event('close'));
  };

  const getTypeLabel = () => {
    if (type === 'days_matter') return 'Days Matter';
    if (type === 'habit') return 'Habit Tracker';
    if (type === 'todo') return 'To-Do';
    if (type === 'focus') return 'Focus (Timer)';
    return '';
  };

  const css: CssProps = {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: 'var(--secondary-bg-color)',

    '.tool-edit-header-save': {
      color: 'var(--primary-accent-color)',
      fontWeight: 'bold',
      padding: '8px 16px',
      cursor: 'pointer',
    },

    '.tool-edit-scroll': {
      flex: 1,
      overflowY: 'auto',
      paddingTop: '16px',
    },

    '.tool-prop-row': {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: 'var(--primary-bg-color)',
      padding: '16px',
      borderBottom: '1px solid var(--primary-border-color)',
      cursor: 'pointer',
    },
    '.tool-prop-row.disabled': {
      opacity: 0.6,
      cursor: 'not-allowed',
    },
    '.prop-label': {
      fontSize: '16px',
      color: 'var(--primary-color)',
      fontWeight: 'bold',
    },
    '.prop-value': {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '16px',
      color: 'var(--secondary-color)',
    },

    '.input-base': {
      width: '100%',
      border: 'none',
      backgroundColor: 'transparent',
      color: 'var(--primary-color)',
      outline: 'none',
    },
    '.title-input': {
      fontSize: '20px',
      fontWeight: 'bold',
      padding: '16px',
      backgroundColor: 'var(--primary-bg-color)',
      marginBottom: '16px',
    },
    '.todo-desc-input': {
      fontSize: '16px',
      padding: '16px',
      backgroundColor: 'var(--primary-bg-color)',
      minHeight: '120px',
      resize: 'none',
    },
    '.date-input, .number-input': {
      border: 'none',
      textAlign: 'right',
      fontSize: '16px',
      color: 'var(--primary-color)',
      backgroundColor: 'transparent',
      outline: 'none',
    },
  };

  const ref: RefProps = {
    onLoad: async () => {
      typeDom.value = getTypeLabel();
      renderColorDot();
      renderBodyFields();
    },
  };

  return (
    <HeaderWithBackFrame
      title={isEdit ? 'Edit Tool' : 'New Tool'}
      onBack={(e: Event) => props.sliderFrameHook.close!(e)}
      right={
        <div class='tool-edit-header-save flex-center-gap-12' onClick={onSave}>
          Save
        </div>
      }
    >
      <div ref={ref} css={css}>
        <div class='tool-edit-scroll no-scrollbar-container flex-col'>
          <div class={`tool-prop-row ${isEdit ? 'disabled' : ''}`} onClick={pickType}>
            <div class='prop-label'>Tool Type</div>
            <div class='prop-value'>
              {typeDom.node}
              {!isEdit && <i class='ifc-icon ma-chevron-right icon-14' style={{ marginLeft: '4px' }} />}
            </div>
          </div>

          <input type='text' class='input-base title-input' placeholder='Tool Title...' value={title} maxLength={40} />

          <div class='tool-prop-row' onClick={pickColor} style={{ marginBottom: '16px' }}>
            <div class='prop-label'>Color Tag</div>
            <div class='prop-value'>
              {colorDom.node} <i class='ifc-icon ma-chevron-right icon-14' style={{ marginLeft: '4px' }} />
            </div>
          </div>

          {bodyFieldsDom.node}
        </div>
      </div>
    </HeaderWithBackFrame>
  );
};
