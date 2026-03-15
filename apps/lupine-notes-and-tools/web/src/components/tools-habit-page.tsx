import {
  CssProps,
  HtmlVar,
  PageProps,
  RefProps,
  SliderFrameHookProps,
  ActionSheetSelect,
  ToggleIcon,
  ToggleIconSize,
  HeaderWithBackFrame,
} from 'lupine.components';
import { LocalToolsService, ToolItem } from '../services/local-tools-service';

interface ToolsHabitPageProps extends PageProps {
  item: ToolItem;
  sliderFrameHook: SliderFrameHookProps;
  onEdit?: (item: ToolItem) => void;
  onDelete?: (id: string) => void;
}

export const ToolsHabitPage = (props: ToolsHabitPageProps) => {
  let viewDate = new Date();
  let selectedDate = new Date();
  const calendarDom = new HtmlVar('');
  const statsDom = new HtmlVar('');

  const onClearAll = async () => {
    await ActionSheetSelect.show({
      title: 'Are you sure you want to clear all data?',
      options: ['Clear All Data'],
      cancelButtonText: 'Cancel',
      handleClicked: async (index: number, close: (val?: any) => void) => {
        close();
        if (index === 0) {
          LocalToolsService.clearHabitData(props.item.id);
          refreshStats();
          refreshCalendar();
        }
      },
    });
  };

  const onEdit = () => {
    // Relying on parent or explicit route. To avoid circular deps, standard way is firing event.
    // For now, since user wants the icon, we can expose an onEdit callback in props if we want, OR
    // just do nothing if they provide no handler. Let's add onEdit/onDelete to props.
    if (props.onEdit) props.onEdit(props.item);
  };

  const onDelete = async () => {
    await ActionSheetSelect.show({
      title: 'Delete this tool?',
      options: ['Delete'],
      cancelButtonText: 'Cancel',
      handleClicked: async (index: number, close: () => void) => {
        close();
        if (index === 0) {
          LocalToolsService.deleteItem(props.item.id);
          if (props.onDelete) props.onDelete(props.item.id);
          props.sliderFrameHook.close!(new MouseEvent('click'));
        }
      },
    });
  };

  const setViewDate = (d: Date) => {
    viewDate = d;
    refreshCalendar();
  };

  const setSelectedDate = (d: Date) => {
    selectedDate = d;
    refreshCalendar();
    refreshStats(); // Might want to update button based on active selected date
  };

  const formatDateString = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const onToggleCheckIn = () => {
    LocalToolsService.toggleHabitDate(props.item.id, formatDateString(selectedDate));
    refreshStats();
    refreshCalendar();
  };

  const refreshStats = () => {
    const updatedItems = LocalToolsService.getItems();
    const activeItem = updatedItems.find((i) => i.id === props.item.id);
    const checkIns = activeItem?.habit?.checkInDates || [];
    const totalCount = checkIns.length;
    const currentStreak = LocalToolsService.getHabitStreak(activeItem?.habit);

    const isFutureDate = selectedDate.getTime() > new Date().getTime();
    const isCheckedIn = checkIns.includes(formatDateString(selectedDate));

    statsDom.value = (
      <div class='habit-stats-container'>
        <div class='habit-stats-text'>
          You have checked in total <span class='stat-highlight'>{totalCount}</span> times.
        </div>
        <div class='habit-stats-text'>
          You are currently on a streak of <span class='stat-highlight'>{currentStreak}</span> days.
        </div>

        <div class='habit-toggle-wrapper flex-center-center' style={{ marginTop: '24px' }}>
          <ToggleIcon
            size={ToggleIconSize.LargeLarge}
            icon={<i class='ifc-icon ma-account-cog-outline' />}
            disabled={isFutureDate}
            checked={isCheckedIn}
            onClick={onToggleCheckIn}
          />
          <div style={{ marginTop: '8px', fontSize: '14px', color: 'var(--secondary-color)' }}>
            {isFutureDate ? 'Future Date' : isCheckedIn ? 'Checked In' : 'Not Checked In'}
          </div>
        </div>
      </div>
    );
  };

  const refreshCalendar = () => {
    const y = viewDate.getFullYear();
    const m = viewDate.getMonth();

    const firstDay = new Date(y, m, 1);
    const lastDay = new Date(y, m + 1, 0);

    const startOffset = firstDay.getDay(); // 0 is Sun
    const totalDays = lastDay.getDate();

    const daysNodes = [];
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    weekdays.forEach((dayName) => {
      daysNodes.push(<div class='diary-calendar-weekday'>{dayName}</div>);
    });

    for (let i = 0; i < startOffset; i++) {
      daysNodes.push(<div class='diary-calendar-day empty'></div>);
    }

    const todayStr = LocalToolsService.getTodayDateString();
    const selectedStr = formatDateString(selectedDate);
    const updatedItems = LocalToolsService.getItems();
    const activeItem = updatedItems.find((i) => i.id === props.item.id);
    const checkedDates = activeItem?.habit?.checkInDates || [];

    for (let i = 1; i <= totalDays; i++) {
      const iterStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const isToday = iterStr === todayStr;
      const isSelected = iterStr === selectedStr;
      const hasCheckedIn = checkedDates.includes(iterStr);

      let cssClass = 'diary-calendar-day';
      if (isSelected) cssClass += ' selected';
      if (isToday) cssClass += ' today';

      daysNodes.push(
        <div
          class={cssClass}
          onClick={() => {
            setSelectedDate(new Date(y, m, i));
          }}
          onDblClick={() => {
            setSelectedDate(new Date(y, m, i));
            // Defer slightly to ensure state selectedDate is updated for onToggleCheckIn logic
            setTimeout(() => onToggleCheckIn(), 0);
          }}
        >
          {i}
          {hasCheckedIn && <div class='habit-dot'></div>}
        </div>
      );
    }

    const navigateMonth = (offset: number) => {
      const newViewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1);
      const newY = newViewDate.getFullYear();
      const newM = newViewDate.getMonth();
      const currentDay = selectedDate.getDate();
      const maxDaysInNewMonth = new Date(newY, newM + 1, 0).getDate();
      const newSelectedDay = Math.min(currentDay, maxDaysInNewMonth);

      setViewDate(newViewDate);
      setSelectedDate(new Date(newY, newM, newSelectedDay));
    };

    calendarDom.value = (
      <div class='diary-calendar-panel'>
        <div class='diary-calendar-header'>
          <button class='diary-calendar-nav-btn' onClick={() => navigateMonth(-12)}>
            &laquo;
          </button>
          <button class='diary-calendar-nav-btn' onClick={() => navigateMonth(-1)}>
            <i class='ifc-icon ma-chevron-left' />
          </button>
          <div class='diary-calendar-title'>
            {viewDate.toLocaleString('default', { month: 'long' })} {y}
          </div>
          <button class='diary-calendar-nav-btn' onClick={() => navigateMonth(1)}>
            <i class='ifc-icon ma-chevron-right' />
          </button>
          <button class='diary-calendar-nav-btn' onClick={() => navigateMonth(12)}>
            &raquo;
          </button>
        </div>
        <div class='diary-calendar-grid'>{daysNodes}</div>
      </div>
    );
  };

  const ref: RefProps = {
    onLoad: async () => {
      refreshStats();
      refreshCalendar();
    },
  };

  const css: CssProps = {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    position: 'relative',
    backgroundColor: 'var(--primary-bg-color)',

    '.habit-clear-all-btn': {
      width: '100%',
      padding: '12px',
      textAlign: 'center',
      color: '#ff4d4f',
      fontWeight: 'bold',
      borderBottom: '1px solid var(--primary-border-color)',
      cursor: 'pointer',
    },
    '.habit-stats-container': {
      padding: '24px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      textAlign: 'center',
    },
    '.habit-stats-text': {
      fontSize: '16px',
      color: 'var(--primary-color)',
    },
    '.stat-highlight': {
      fontWeight: 'bold',
      fontSize: '18px',
      color: 'var(--primary-accent-color)',
    },

    // Borrowed explicitly from Diary format for grid constraints and coloring scheme
    '.diary-calendar-panel': {
      padding: '12px 16px',
      borderBottom: '1px solid var(--primary-border-color)',
      userSelect: 'none',
    },
    '.diary-calendar-header': {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '4px 0 12px 0',
      gap: '4px',
    },
    '.diary-calendar-nav-btn': {
      padding: '4px 12px',
      border: '1px solid transparent',
      backgroundColor: 'transparent',
      cursor: 'pointer',
      color: 'var(--primary-color)',
      fontSize: '20px',
      fontWeight: 'bold',
      '&:hover': { color: 'var(--primary-accent-color)' },
    },
    '.diary-calendar-title': {
      flex: 1,
      textAlign: 'center',
      fontSize: '18px',
      fontWeight: 'bold',
      color: 'var(--primary-color)',
    },
    '.diary-calendar-grid': {
      display: 'grid',
      gridTemplateColumns: 'repeat(7, 1fr)',
      gap: '8px',
      textAlign: 'center',
    },
    '.diary-calendar-weekday': {
      fontSize: '12px',
      color: 'var(--secondary-color)',
      fontWeight: 'bold',
      marginBottom: '8px',
    },
    '.diary-calendar-day': {
      position: 'relative',
      textAlign: 'center',
      padding: '8px 0',
      cursor: 'pointer',
      borderRadius: '8px',
      fontSize: '16px',
      transition: 'all 0.2s',
      color: 'var(--primary-color)',
      height: '40px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      border: '1px solid transparent',
    },
    '.diary-calendar-day:not(.empty):hover': {
      backgroundColor: 'var(--hover-bg-color, #f5f5f5)',
    },
    '.diary-calendar-day.today': {
      color: 'var(--primary-accent-color)',
      fontWeight: 'bold',
    },
    '.diary-calendar-day.selected': {
      border: '1px solid var(--primary-accent-color)',
      backgroundColor: 'rgba(24, 144, 255, 0.1)',
    },
    '.habit-dot': {
      position: 'absolute',
      bottom: '4px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: '4px',
      height: '4px',
      backgroundColor: 'var(--primary-accent-color)',
      borderRadius: '50%',
    },
    '.flex-center-center': {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
    },
  };

  const pageRight = (
    <div class='flex-center-gap-12'>
      <i class='ifc-icon ma-pencil-outline icon-24-pointer' onClick={onEdit}></i>
      <i class='ifc-icon ma-delete-off-outline icon-24-pointer color-red' onClick={onDelete}></i>
    </div>
  );

  return (
    <HeaderWithBackFrame
      title={props.item.title || 'Habit Tracker'}
      onBack={(e: Event) => props.sliderFrameHook.close!(e)}
      right={pageRight}
    >
      <div css={css} ref={ref} class='flex-col h-100'>
        <div class='habit-clear-all-btn' onClick={onClearAll}>
          Clear All Data
        </div>

        {calendarDom.node}
        {statsDom.node}
      </div>
    </HeaderWithBackFrame>
  );
};
