import {
  CssProps,
  HtmlVar,
  MobileHeaderCenter,
  MobileHeaderTitleIcon,
  PageProps,
  RefProps,
  SliderFrame,
  SliderFrameHookProps,
  MobileHeaderEmptyIcon,
  MobileTopSysIcon,
  ActionSheetSelect,
  createDragUtil,
  DomUtils,
} from 'lupine.components';
import { LocalDiaryProps, LocalDiaryService } from '../services/local-diary-service';
import { StorageManager } from '../services/cloud/storage-manager';
import { DiaryEditComponent } from '../components/diary-edit';
import { DiaryDetailComponent } from '../components/diary-detail';
import { SideMenuContent } from '../components/side-menu-content';
import { DiarySearchComponent } from '../components/diary-search-page';

const extractText = (html: string) => {
  const tmp = document.createElement('DIV');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
};

const formatDate = (date: Date) => {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const DiaryPage = async (props: PageProps) => {
  let currentFilter: 'month' | 'year' | 'all' = 'month';
  let viewDate = new Date();
  let selectedDate = new Date();

  const calendarDom = new HtmlVar('');
  const listDom = new HtmlVar('');
  const sliderFrameHook: SliderFrameHookProps = {};

  let draggedAmount = 0;
  let menuClosedJustNow = false;

  const onOpenSearch = () => {
    resetSwipeMenus();
    sliderFrameHook.load!(<DiarySearchComponent sliderFrameHook={sliderFrameHook} />);
  };

  const onAddDiary = async () => {
    const dStr = formatDate(selectedDate);
    const existing = await LocalDiaryService.getDiaryByDate(dStr);
    sliderFrameHook.load!(
      <DiaryEditComponent
        date={dStr}
        diary={existing as LocalDiaryProps} // Existing would be from cache fully formed, or we'll type existing safely
        sliderFrameHook={sliderFrameHook}
        onSaved={() => {
          refreshCalendar();
          refreshList();
        }}
      />
    );
    resetSwipeMenus();
  };

  const onEditDiary = (diary: Partial<LocalDiaryProps>) => {
    sliderFrameHook.load!(
      <DiaryEditComponent
        date={diary.date!}
        diary={diary}
        sliderFrameHook={sliderFrameHook}
        onSaved={() => {
          refreshCalendar();
          refreshList();
        }}
      />
    );
  };

  const onViewDiary = (diary: Partial<LocalDiaryProps>) => {
    resetSwipeMenus();
    sliderFrameHook.load!(
      <DiaryDetailComponent
        diary={diary as LocalDiaryProps}
        sliderFrameHook={sliderFrameHook}
        onSaved={() => {
          refreshCalendar();
          refreshList();
        }}
      />
    );
  };

  const onDeleteDiary = async (id: number, e: Event) => {
    e.stopPropagation();
    await ActionSheetSelect.show({
      title: 'Are you sure you want to delete this diary?',
      options: ['Remove'],
      cancelButtonText: 'Cancel',
      handleClicked: async (index: number, close: () => void) => {
        close();
        if (index === 0) {
          LocalDiaryService.deleteDiary(id);
          refreshCalendar();
          refreshList();
        }
      },
    });
  };

  const dragUtil = createDragUtil();
  dragUtil.setOnMoveCallback((clientX, clientY, movedX, movedY, initialDirection) => {
    let dragDom = dragUtil.getDraggingDom();
    if (!dragDom) return;
    if (dragDom.closest('.action-btn')) return;

    dragDom = dragDom.closest('.diary-card') as HTMLDivElement;
    if (!dragDom) return;
    if (initialDirection === 'vertical') return;

    const diffX = movedX;
    if (diffX < -5 && !dragDom.style.transform.includes('translateX')) {
      const closedOther = resetSwipeMenus(parseInt(dragDom.getAttribute('data-id') || '-1'));
      if (closedOther) menuClosedJustNow = true;
    }

    if (menuClosedJustNow) return;
    dragDom.style.transition = 'none';
    let targetX = diffX;
    if (targetX > 0) targetX = 0;
    if (targetX < -150) targetX = -150;
    dragDom.style.transform = `translateX(${targetX}px)`;

    const actionLayer = dragDom.previousElementSibling as HTMLDivElement;
    if (actionLayer && actionLayer.classList.contains('diary-card-actions-layer')) {
      let opacity = Math.abs(targetX) / 100;
      if (opacity > 1) opacity = 1;
      actionLayer.style.opacity = opacity.toString();
      actionLayer.style.pointerEvents = targetX < -50 ? 'auto' : 'none';
    }
    draggedAmount = Math.abs(diffX);
  });

  dragUtil.setOnMoveEndCallback(() => {
    menuClosedJustNow = false;
    let dragDom = dragUtil.getDraggingDom();
    if (!dragDom) return;

    dragDom = dragDom.closest('.diary-card') as HTMLDivElement;
    if (!dragDom) return;

    dragDom.style.transition = 'transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)';
    const currentTransform = dragDom.style.transform;
    const match = currentTransform.match(/translateX\(([-\d\.]+)px\)/);
    if (match) {
      const x = parseFloat(match[1]);
      if (x < -50) {
        dragDom.style.transform = `translateX(-100px)`;
      } else {
        dragDom.style.transform = `translateX(0px)`;
        const actionLayer = dragDom.previousElementSibling as HTMLDivElement;
        if (actionLayer && actionLayer.classList.contains('diary-card-actions-layer')) {
          actionLayer.style.opacity = '0';
        }
      }
    } else {
      dragDom.style.transform = `translateX(0px)`;
      const actionLayer = dragDom.previousElementSibling as HTMLDivElement;
      if (actionLayer && actionLayer.classList.contains('diary-card-actions-layer')) {
        actionLayer.style.opacity = '0';
      }
    }
  });

  const resetSwipeMenus = (excludeId?: number): boolean => {
    let closedAny = false;
    const cards = document.querySelectorAll('.diary-list-container .diary-card') as NodeListOf<HTMLDivElement>;
    cards.forEach((c) => {
      if (excludeId !== undefined) {
        const id = parseInt(c.getAttribute('data-id') || '-1');
        if (id === excludeId) return;
      }
      const transform = c.style.transform;
      const match = transform.match(/translateX\(([-\d\.]+)px\)/);
      if (match && parseFloat(match[1]) < -5) {
        c.style.transform = 'translateX(0px)';
        const actionLayer = c.previousElementSibling as HTMLDivElement;
        if (actionLayer && actionLayer.classList.contains('diary-card-actions-layer')) {
          actionLayer.style.opacity = '0';
        }
        closedAny = true;
      }
    });
    return closedAny;
  };

  const setFilter = (f: 'month' | 'year' | 'all') => {
    currentFilter = f;
    refreshList();
    renderFilters();
  };

  const changeMonth = (delta: number) => {
    const y = viewDate.getFullYear();
    const m = viewDate.getMonth() + delta;
    viewDate = new Date(y, m, 1);

    const targetDate = selectedDate.getDate();
    const daysInNewMonth = new Date(y, m + 1, 0).getDate();
    selectedDate = new Date(y, m, Math.min(targetDate, daysInNewMonth));

    refreshCalendar();
    refreshList();
  };

  const changeYear = (delta: number) => {
    const y = viewDate.getFullYear() + delta;
    const m = viewDate.getMonth();
    viewDate = new Date(y, m, 1);

    const targetDate = selectedDate.getDate();
    const daysInNewMonth = new Date(y, m + 1, 0).getDate();
    selectedDate = new Date(y, m, Math.min(targetDate, daysInNewMonth));

    refreshCalendar();
    refreshList();
  };

  const refreshCalendar = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthLastDay = new Date(year, month, 0).getDate();

    const diaries = LocalDiaryService.getAllDiaries();
    const daysNodes: any[] = [];

    ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((w) => {
      daysNodes.push(<div class='diary-calendar-weekday'>{w}</div>);
    });

    const todayStr = formatDate(new Date());
    const selectedStr = formatDate(selectedDate);

    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      daysNodes.push(<div class='diary-calendar-day not-this-month'>{prevMonthLastDay - i}</div>);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      const dStr = formatDate(d);
      const isToday = dStr === todayStr;
      const isSelected = dStr === selectedStr;
      const hasDiary = diaries.some((diary) => diary.date === dStr);
      const diaryColor = hasDiary ? diaries.find((diary) => diary.date === dStr)?.color : null;

      daysNodes.push(
        <div
          class={['diary-calendar-day', isToday ? 'today' : '', isSelected ? 'selected' : ''].join(' ')}
          onClick={() => {
            selectedDate = new Date(d);
            viewDate = new Date(d);
            refreshCalendar();
            refreshList();
          }}
          onDblClick={() => {
            selectedDate = new Date(d);
            onAddDiary();
          }}
        >
          {i}
          {hasDiary && <div class='diary-calendar-dot' style={{ backgroundColor: diaryColor || '#eb2f96' }}></div>}
        </div>
      );
    }

    calendarDom.value = (
      <div class='diary-calendar-panel'>
        <div class='diary-calendar-header'>
          <button class='diary-calendar-nav-btn' onClick={() => changeYear(-1)}>
            &laquo;
          </button>
          <button class='diary-calendar-nav-btn' onClick={() => changeMonth(-1)}>
            &lsaquo;
          </button>

          <div class='diary-calendar-title'>
            {year} - {(month + 1).toString().padStart(2, '0')}
          </div>

          <button class='diary-calendar-nav-btn' onClick={() => changeMonth(1)}>
            &rsaquo;
          </button>
          <button class='diary-calendar-nav-btn' onClick={() => changeYear(1)}>
            &raquo;
          </button>
        </div>
        <div class='diary-calendar-grid'>{daysNodes}</div>
      </div>
    );
    renderFilters();
  };

  const renderFilters = () => {
    const fDom = document.querySelector('.diary-filters') as HTMLDivElement;
    if (!fDom) return;
    fDom.innerHTML = '';

    const filters = [
      { key: 'month', label: 'This Month' },
      { key: 'year', label: 'This Year' },
      { key: 'all', label: 'All' },
    ];

    filters.forEach((f) => {
      const btn = document.createElement('div');
      btn.className = `diary-filter-btn ${currentFilter === f.key ? 'active' : ''}`;
      btn.innerText = f.label;
      btn.onclick = () => setFilter(f.key as any);
      fDom.appendChild(btn);
    });
  };

  const refreshList = () => {
    const all = LocalDiaryService.getAllDiaries();
    let filtered = all;

    if (currentFilter === 'month') {
      const prefix = `${viewDate.getFullYear()}-${(viewDate.getMonth() + 1).toString().padStart(2, '0')}`;
      filtered = all.filter((d) => d.date && d.date.startsWith(prefix));
    } else if (currentFilter === 'year') {
      const prefix = `${viewDate.getFullYear()}-`;
      filtered = all.filter((d) => d.date && d.date.startsWith(prefix));
    }

    if (filtered.length === 0) {
      listDom.value = <div class='diary-empty-state'>No diaries found.</div>;
      return;
    }

    listDom.value = (
      <div class='diary-list-container'>
        {filtered.map((diary) => (
          <div class='note-card-wrapper'>
            <div class='diary-card-actions-layer'>
              <div
                class='action-btn edit-btn'
                onClick={(e) => {
                  e.stopPropagation();
                  onEditDiary(diary);
                }}
              >
                <i class='ifc-icon ma-pencil-outline' />
              </div>
              <div
                class='action-btn delete-btn'
                onClick={(e) => {
                  onDeleteDiary(diary.id!, e);
                }}
              >
                <i class='ifc-icon ma-delete-off-outline' />
              </div>
            </div>
            <div
              class='diary-card row-box'
              style={{ borderLeft: diary.color ? `6px solid ${diary.color}` : '6px solid transparent' }}
              data-id={diary.id}
              onMouseDown={(e) => {
                resetSwipeMenus(diary.id!);
                draggedAmount = 0;
                dragUtil.onMouseDown(e);
              }}
              onTouchStart={(e) => {
                resetSwipeMenus(diary.id!);
                draggedAmount = 0;
                dragUtil.onTouchStart(e);
              }}
              onClick={(e) => {
                if (draggedAmount > 5) return;
                const cardDom = e.currentTarget as HTMLElement;
                const transform = cardDom.style.transform;
                const match = transform.match(/translateX\(([-\d\.]+)px\)/);
                if (match && parseFloat(match[1]) < -5) {
                  cardDom.style.transform = 'translateX(0px)';
                  const actionLayer = cardDom.previousElementSibling as HTMLDivElement;
                  if (actionLayer && actionLayer.classList.contains('diary-card-actions-layer')) {
                    actionLayer.style.opacity = '0';
                  }
                  return;
                }
                const closedOther = resetSwipeMenus();
                if (closedOther) return;
                onViewDiary(diary);
              }}
            >
              <div class='diary-card-content flex-1'>
                <div class='diary-card-title'>{diary.title || 'Untitled'}</div>
                <div class='diary-card-preview ellipsis'>{extractText(diary.content || '')}</div>
                <div class='diary-card-date'>{diary.date}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const ref: RefProps = {
    onLoad: async () => {
      await StorageManager.waitForInit();
      refreshCalendar();
      refreshList();
    },
  };

  const css: CssProps = {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    position: 'relative',

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
      '&:hover': { color: '#eb2f96' },
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
      gap: '2px',
    },
    '.diary-calendar-weekday': {
      textAlign: 'center',
      fontSize: '12px',
      fontWeight: 'bold',
      color: 'var(--secondary-color)',
      padding: '8px 0',
    },
    '.diary-calendar-day': {
      position: 'relative',
      textAlign: 'center',
      padding: '8px 0',
      cursor: 'pointer',
      borderRadius: '8px',
      fontSize: '15px',
      transition: 'all 0.2s',
      fontWeight: '500',
      color: 'var(--primary-color)',
      height: '40px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',

      '&:hover': {
        backgroundColor: '#fff0f6', // Pink light
        color: '#eb2f96',
      },

      '&.selected': {
        border: '2px solid #eb2f96',
        color: '#eb2f96',
        fontWeight: 'bold',
      },

      '&.today': {
        backgroundColor: '#eb2f96',
        color: '#fff',
        fontWeight: 'bold',
      },

      '&.not-this-month': {
        color: 'var(--secondary-color)',
        opacity: 0.5,
      },

      '.diary-calendar-dot': {
        width: '4px',
        height: '4px',
        borderRadius: '50%',
        marginTop: '2px',
        position: 'absolute',
        bottom: '4px',
      },
    },

    '.diary-filters': {
      display: 'flex',
      gap: '12px',
      padding: '16px',
    },
    '.diary-filter-btn': {
      padding: '6px 16px',
      borderRadius: '16px',
      backgroundColor: 'var(--primary-bg-color)',
      color: 'var(--secondary-color)',
      fontSize: '14px',
      cursor: 'pointer',
      transition: 'all 0.2s',
      border: '1px solid var(--primary-border-color)',
      fontWeight: '500',
      '&.active': {
        backgroundColor: '#eb2f96',
        color: '#fff',
        borderColor: '#eb2f96',
      },
    },

    '.diary-empty-state': {
      textAlign: 'center',
      padding: '48px 20px',
      color: 'var(--secondary-color)',
      fontSize: '15px',
    },

    '.diary-list-container': {
      position: 'relative',
      padding: '0 16px 16px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
    },
    '.diary-card-content': {
      minWidth: 0,
    },
    '.diary-card-actions-layer': {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      display: 'flex',
      justifyContent: 'flex-end',
      alignItems: 'center',
      zIndex: 1,
      backgroundColor: 'transparent',
      borderRadius: '12px',
      overflow: 'hidden',
      opacity: 0,
      transition: 'opacity 0.2s ease',
    },
    '.action-btn': {
      height: '100%',
      width: '50px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      cursor: 'pointer',
    },
    '.action-btn.edit-btn': { backgroundColor: 'var(--primary-accent-color)' },
    '.action-btn.delete-btn': {
      backgroundColor: '#ff4d4f',
      borderTopRightRadius: '12px',
      borderBottomRightRadius: '12px',
    },
    '.action-btn i': { color: 'white' },
    '.diary-card': {
      backgroundColor: 'var(--primary-bg-color)',
      borderRadius: '12px',
      padding: '16px',
      cursor: 'pointer',
      alignItems: 'flex-start',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      position: 'relative',
      zIndex: 2,
      display: 'flex',
      gap: '12px',
    },
    '.diary-card-title': {
      fontSize: '16px',
      fontWeight: 'bold',
      color: 'var(--primary-color)',
      marginBottom: '4px',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    },
    '.diary-card-preview': {
      fontSize: '14px',
      color: 'var(--secondary-color)',
      marginBottom: '8px',
      lineHeight: '1.4',
    },
    '.diary-card-date': {
      fontSize: '12px',
      color: 'var(--secondary-color)',
    },
    '.diary-fab-btn': {
      position: 'absolute',
      right: '24px',
      bottom: '24px',
      width: '56px',
      height: '56px',
      borderRadius: '28px',
      backgroundColor: '#eb2f96',
      color: 'white',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
      cursor: 'pointer',
      zIndex: 10,
      fontFamily: 'monospace',
    },
    '.fab-icon': {
      fontSize: '32px',
      lineHeight: '1',
    },
  };

  const handleBgTouch = (e: Event) => {
    let target = e.target as Element;
    if (target && target.closest && target.closest('.action-btn')) return;
    if (target && target.closest && target.closest('.diary-card')) return;
    if (target && target.closest && target.closest('.diary-calendar-panel')) return;
    resetSwipeMenus();
  };

  return (
    <div
      css={css}
      onClick={handleBgTouch}
      onTouchStart={handleBgTouch as any}
      onMouseMove={dragUtil.onMouseMove as any}
      onMouseUp={dragUtil.onMouseUp}
      onTouchMove={dragUtil.onTouchMove as any}
      onTouchEnd={dragUtil.onTouchEnd as any}
    >
      <MobileHeaderCenter>
        <MobileHeaderTitleIcon
          title='Diary'
          left={<MobileHeaderEmptyIcon />}
          right={
            <div class='flex-center-gap-12'>
              <i class='ifc-icon bs-search icon-20-pointer' onClick={onOpenSearch}></i>
              <MobileTopSysIcon />
            </div>
          }
        />
      </MobileHeaderCenter>

      <div class='diary-scroll-area flex-col flex-1' ref={ref}>
        <SliderFrame hook={sliderFrameHook} />
        {calendarDom.node}
        <div class='diary-filters'></div>
        {listDom.node}
      </div>

      <div class='diary-fab-btn' onClick={onAddDiary}>
        <span class='fab-icon'>+</span>
      </div>
    </div>
  );
};
