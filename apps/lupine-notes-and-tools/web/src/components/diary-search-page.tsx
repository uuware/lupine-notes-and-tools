import {
  CssProps,
  PageProps,
  HtmlVar,
  RefProps,
  SliderFrameHookProps,
  HeaderWithBackFrame,
  DomUtils,
  createDragUtil,
  ActionSheetSelect,
} from 'lupine.components';
import { SearchInput, SearchInputHookProps } from './search-input';
import { InputHistoryComponent, addHistoryItem, clearHistoryList } from './input-history-component';
import { LocalDiaryService, LocalDiaryProps } from '../services/local-diary-service';
import { DiaryEditComponent } from './diary-edit';
import { DiaryDetailComponent } from './diary-detail';

const extractText = (html: string) => {
  const tmp = document.createElement('DIV');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
};

export const DiarySearchComponent = async (props: { sliderFrameHook: SliderFrameHookProps }) => {
  const css: CssProps = {
    flex: 1,
    overflowY: 'auto',
    backgroundColor: 'var(--secondary-bg-color)',
    paddingBottom: '24px',

    '.search-input-wrapper': {
      width: '100%',
      padding: '0 16px',
    },

    '.diary-list-container': {
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
    },
    '.diary-card-wrapper': {
      position: 'relative',
      marginBottom: '16px',
      width: '100%',
      borderRadius: '12px',
      overflow: 'hidden',
      boxShadow: '0 4px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.05)',
      backgroundColor: 'transparent',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
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
    '.search-color-border': {
      borderLeft: '6px solid var(--card-color, transparent)',
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
    '.diary-card-drag-handle': {
      color: 'var(--primary-border-color)',
      fontSize: '20px',
      cursor: 'grab',
      padding: '4px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },

    '.diary-empty-state': {
      textAlign: 'center',
      padding: '48px 20px',
      color: 'var(--secondary-color)',
      fontSize: '15px',
    },
  };

  const searchResultsDom = new HtmlVar('');
  const historyDom = new HtmlVar('');
  const searchInputHook: SearchInputHookProps = {};

  let currentSearchQuery = '';
  let draggedAmount = 0;
  let menuClosedJustNow = false;

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

  const onEditDiary = (diary: Partial<LocalDiaryProps>) => {
    props.sliderFrameHook.load!(
      <DiaryEditComponent
        diary={diary}
        date={diary.date || ''}
        sliderFrameHook={props.sliderFrameHook}
        onSaved={() => onSearchQuery(currentSearchQuery)}
      />
    );
  };

  const onViewDiary = (diary: Partial<LocalDiaryProps>) => {
    resetSwipeMenus();
    props.sliderFrameHook.load!(
        <DiaryDetailComponent
          diary={diary as LocalDiaryProps}
          sliderFrameHook={props.sliderFrameHook}
          onSaved={() => onSearchQuery(currentSearchQuery)}
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
          onSearchQuery(currentSearchQuery);
        }
      },
    });
  };

  const dragUtil = createDragUtil();
  dragUtil.setOnMoveCallback((clientX, clientY, movedX) => {
    let dragDom = dragUtil.getDraggingDom();
    if (!dragDom) return;
    if (dragDom.classList.contains('diary-card-drag-handle')) return;
    if (dragDom.closest && dragDom.closest('.action-btn')) return;

    dragDom = dragDom.closest('.diary-card') as HTMLDivElement;
    if (!dragDom) return;

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

  // resetSwipeMenus was moved up

  const handleBgTouch = (e: Event) => {
    let target = e.target as Element;
    if (target && target.closest && target.closest('.action-btn')) return;
    if (target && target.closest && target.closest('.diary-card')) return;
    resetSwipeMenus();
  };

  const showHistory = () => {
    historyDom.value = (
      <InputHistoryComponent
        historyKey='diary_search_history'
        onItemClick={(item) => {
          searchInputHook.setValue && searchInputHook.setValue(item);
          onSearchQuery(item);
        }}
        onClearHistory={() => {
          clearHistoryList('diary_search_history');
          showHistory();
        }}
      />
    );
  };

  const hideHistory = () => {
    historyDom.value = '';
  };

  const onSearchQuery = (value?: string) => {
    const query = (value || '').trim();
    currentSearchQuery = query;

    if (!query) {
      searchResultsDom.value = '';
      showHistory();
      return;
    }

    addHistoryItem('diary_search_history', query);
    hideHistory();

    const all = LocalDiaryService.getAllDiaries();
    const q = query.toLowerCase();
    const results = all.filter(
      (n) =>
        (n.title?.toLowerCase() || '').includes(q) || (n.content?.toLowerCase() || '').includes(q) || (n.date?.toLowerCase() || '').includes(q)
    );

    if (results.length === 0) {
      searchResultsDom.value = <div class='diary-empty-state'>No diaries found matching "{query}"</div>;
      return;
    }

    searchResultsDom.value = (
      <div class='diary-list-container'>
        {results.map((diary) => (
          <div class='diary-card-wrapper'>
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
              class='diary-card row-box search-color-border'
              style={{ '--card-color': diary.color || 'transparent' } as any}
              data-id={diary.id}
              onMouseDown={(e) => {
                resetSwipeMenus(diary.id);
                draggedAmount = 0;
                dragUtil.onMouseDown(e);
              }}
              onTouchStart={(e) => {
                resetSwipeMenus(diary.id);
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
              <div class='diary-card-content flex-1' style={{ minWidth: 0 }}>
                <div class='diary-card-title'>{diary.title || 'Untitled'}</div>
                <div class='diary-card-preview ellipsis'>{extractText(diary.content || '')}</div>
                <div class='diary-card-date'>{diary.date || ''}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const onClearSearch = () => {
    onSearchQuery('');
  };

  const ref: RefProps = {
    onLoad: async () => {
      showHistory();
      const input = ref.current?.querySelector('.search-in-input') as HTMLInputElement | null;
      if (input) {
        requestAnimationFrame(() => input.focus());
      }
    },
  };

  (ref as any).current = null;
  const originalOnLoad = ref.onLoad;
  ref.onLoad = async (el) => {
    (ref as any).current = el;
    if (originalOnLoad) await originalOnLoad(el);
  };

  return (
    <HeaderWithBackFrame
      title={
        <SearchInput
          placeholder='Search diary...'
          onSearch={onSearchQuery}
          onClear={onClearSearch}
          onFocus={showHistory}
          class='w-100p'
          hook={searchInputHook}
        />
      }
      right={<span></span>}
      onBack={(e: Event) => props.sliderFrameHook.close!(e)}
    >
      <div
        css={css}
        ref={ref}
        class='diary-search-wrapper flex-col h-100'
        onClick={handleBgTouch}
        onTouchStart={handleBgTouch as any}
        onMouseMove={dragUtil.onMouseMove as any}
        onMouseUp={dragUtil.onMouseUp}
        onTouchMove={dragUtil.onTouchMove as any}
        onTouchEnd={dragUtil.onTouchEnd as any}
      >
        {searchResultsDom.node}
        {historyDom.node}
      </div>
    </HeaderWithBackFrame>
  );
};
