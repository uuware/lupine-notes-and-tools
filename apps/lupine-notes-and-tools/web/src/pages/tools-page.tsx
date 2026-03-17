import {
  ActionSheetSelect,
  createDragUtil,
  CssProps,
  HtmlVar,
  MobileHeaderCenter,
  MobileHeaderEmptyIcon,
  MobileHeaderTitleIcon,
  MobileTopSysIcon,
  PageProps,
  RefProps,
  SliderFrame,
  SliderFrameHookProps,
} from 'lupine.components';
import { LocalToolsService, ToolItem, TOOL_CATEGORIES } from '../services/local-tools-service';
import { StorageManager } from '../services/cloud/storage-manager';
import { ToolsEditPage } from '../components/tools-edit';
import { ToolsFocusPage } from '../components/tools-focus-page';
import { ToolsHabitPage } from '../components/tools-habit-page';
import { ToolsTodoPage } from '../components/tools-todo-page';
import { ToolsDaysMatterPage } from '../components/tools-days-matter-page';

export const ToolsPage = async (props: PageProps) => {
  const dom = new HtmlVar('');
  const sliderFrameHook: SliderFrameHookProps = {};
  let currentItems: Partial<ToolItem>[] = [];
  let draggedAmount = 0;

  const loadData = () => {
    currentItems = LocalToolsService.getItems();
    dom.value = renderList(currentItems);
  };

  const css: CssProps = {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    position: 'relative',
    backgroundColor: 'var(--secondary-bg-color)',

    '.tools-scroll': {
      flex: 1,
      overflowY: 'auto',
      padding: '16px',
    },
    '.tool-card': {
      backgroundColor: 'var(--primary-bg-color)',
      borderRadius: '12px',
      padding: '16px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      position: 'relative',
      zIndex: 2,
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      cursor: 'pointer',
    },
    '.tool-card.is-dragging': {
      transform: 'scale(1.02) !important',
      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
      zIndex: 5,
    },
    '.tool-card-actions-layer': {
      position: 'absolute',
      right: 0,
      top: 0,
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
    '.edit-btn': {
      backgroundColor: 'var(--primary-accent-color)',
    },
    '.delete-btn': {
      backgroundColor: '#ff4d4f', // danger red
      borderTopRightRadius: '12px',
      borderBottomRightRadius: '12px',
    },
    '.drag-handle': {
      padding: '8px',
      cursor: 'grab',
      color: 'var(--secondary-color)',
      opacity: 0.5,
      zIndex: 10,
    },
    '.drag-handle:active': { cursor: 'grabbing' },
    '.tool-content': {
      flex: 1,
      minWidth: 0,
    },
    '.tool-card-right': {
      flexShrink: 0,
    },

    // Type specific styles
    '.tool-title': {
      fontSize: '16px',
      fontWeight: 'bold',
      color: 'var(--primary-color)',
      marginBottom: '4px',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    },
    '.tool-subtitle': {
      fontSize: '14px',
      color: 'var(--secondary-color)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    },

    // Days Matter
    '.days-matter-urgent': {
      color: '#52c41a', // green
      fontWeight: 'bold',
      fontSize: '24px',
    },
    '.days-matter-warning': {
      color: '#95de64', // light green
      fontWeight: 'bold',
      fontSize: '24px',
    },
    '.days-matter-normal': {
      color: 'var(--primary-accent-color)',
      fontWeight: 'bold',
      fontSize: '24px',
    },
    '.days-matter-past': {
      color: 'var(--secondary-color)',
      fontWeight: 'bold',
      fontSize: '24px',
    },

    // To-Do
    '.todo-row': {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      minWidth: 0,
    },
    '.todo-completed .tool-title': {
      textDecoration: 'line-through',
      color: 'var(--secondary-color)',
    },
    '.checkbox-icon': {
      fontSize: '1.2em', // Scale height approximately with font
      color: 'var(--secondary-color)',
      flexShrink: 0,
    },
    '.checkbox-icon.checked': {
      color: 'var(--primary-accent-color)',
    },

    // Habit
    '.habit-warning': {
      color: '#ff4d4f',
    },
    '.habit-success': {
      color: '#52c41a', // same as days-matter-urgent green
    },
    '.fab-button': {
      backgroundColor: '#990707ff',
    },
  };

  const handleBgTouch = (e: Event) => {
    let target = e.target as Element;
    if (target && target.closest && target.closest('.action-btn')) return;
    if (target && target.closest && target.closest('.tool-card')) return;
    resetSwipeMenus();
  };

  const resetSwipeMenus = (excludeId?: string) => {
    let anyClosed = false;
    const cards = ref.current?.querySelectorAll('.tool-card') as NodeListOf<HTMLElement>;
    cards?.forEach((card) => {
      const id = card.getAttribute('data-id');
      if (id !== excludeId) {
        if (card.style.transform !== 'translateX(0px)' && card.style.transform !== '') {
          card.style.transform = 'translateX(0px)';
          const actionLayer = card.previousElementSibling as HTMLDivElement;
          if (actionLayer) actionLayer.style.opacity = '0';
          anyClosed = true;
        }
      }
    });
    return anyClosed;
  };

  const onAddTool = () => {
    resetSwipeMenus();
    sliderFrameHook.load!(<ToolsEditPage sliderFrameHook={sliderFrameHook} onSaved={loadData} />);
  };

  const onEditTool = (item: Partial<ToolItem>, e: Event) => {
    sliderFrameHook.load!(<ToolsEditPage item={item} sliderFrameHook={sliderFrameHook} onSaved={loadData} />);
  };

  const onDeleteTool = async (id: string, e: Event) => {
    e.stopPropagation();
    await ActionSheetSelect.show({
      title: 'Delete this tool?',
      options: ['Delete'],
      cancelButtonText: 'Cancel',
      handleClicked: async (index, close) => {
        close();
        if (index === 0) {
          LocalToolsService.deleteItem(id);
          loadData();
        }
      },
    });
  };

  const onToggleTodo = (item: Partial<ToolItem>, e: Event) => {
    e.stopPropagation();
    if (!item.todo) return;
    const cloned = { ...item } as ToolItem; // cast since we know it's a complete item once toggled
    cloned.todo!.isCompleted = !cloned.todo!.isCompleted;
    LocalToolsService.updateItem(cloned);
    loadData();
  };

  const onClickCard = (item: Partial<ToolItem>, e: Event) => {
    if (draggedAmount > 5) return;
    const cardDom = e.currentTarget as HTMLElement;
    const transform = cardDom.style.transform;
    const match = transform.match(/translateX\(([-\d\.]+)px\)/);
    if (match && parseFloat(match[1]) < -5) {
      cardDom.style.transform = 'translateX(0px)';
      const actionLayer = cardDom.previousElementSibling as HTMLDivElement;
      if (actionLayer && actionLayer.classList.contains('tool-card-actions-layer')) {
        actionLayer.style.opacity = '0';
      }
      return;
    }
    const closedOther = resetSwipeMenus();
    if (closedOther) return;

    onViewTool(item);
  };

  const onViewTool = (item: Partial<ToolItem>) => {
    resetSwipeMenus();
    if (item.type === 'focus') {
      sliderFrameHook.load!(
        <ToolsFocusPage
          item={item}
          sliderFrameHook={sliderFrameHook}
          onEdit={onEditToolCallback}
          onDelete={onDeleteToolCallback}
        />
      );
    } else if (item.type === 'habit') {
      sliderFrameHook.load!(
        <ToolsHabitPage
          {...props}
          item={item}
          sliderFrameHook={sliderFrameHook}
          onEdit={onEditToolCallback}
          onDelete={onDeleteToolCallback}
        />
      );
    } else if (item.type === 'todo') {
      sliderFrameHook.load!(
        <ToolsTodoPage
          item={item}
          sliderFrameHook={sliderFrameHook}
          onEdit={onEditToolCallback}
          onDelete={onDeleteToolCallback}
        />
      );
    } else if (item.type === 'days_matter') {
      sliderFrameHook.load!(
        <ToolsDaysMatterPage
          item={item}
          sliderFrameHook={sliderFrameHook}
          onEdit={onEditToolCallback}
          onDelete={onDeleteToolCallback}
        />
      );
    } else {
      onEditTool(item, new Event('click')); // default fallback if needed
    }
  };

  // Helper callbacks matching the expected signatures
  const onEditToolCallback = (item: Partial<ToolItem>) => {
    onEditTool(item, new Event('click'));
  };

  const onDeleteToolCallback = (id: string) => {
    // Delete action within detail page naturally handles removing the item.
    // The detail page handles the local storage delete, so we just reload list.
    loadData();
  };

  const dragUtil = createDragUtil();
  dragUtil.setOnMoveCallback((clientX: number, clientY: number, movedX: number, movedY: number) => {
    draggedAmount += Math.abs(movedX) + Math.abs(movedY);
    const dragDom = dragUtil.getDraggingDom();
    if (!dragDom) return;

    if (dragDom.classList.contains('tool-card')) {
      let x = movedX;
      if (x > 0) x = 0; // only swipe left

      const actionLayer = dragDom.previousElementSibling as HTMLDivElement;
      let maxSwipe = -100;
      if (actionLayer && actionLayer.classList.contains('tool-card-actions-layer')) {
        maxSwipe = -(actionLayer.children.length * 50);
        actionLayer.style.opacity = x < -5 ? '1' : '0';
      }

      if (x < maxSwipe) x = maxSwipe; // cap swipe exactly at bounds
      dragDom.style.transform = `translateX(${x}px)`;
    } else if (dragDom.classList.contains('drag-handle')) {
      resetSwipeMenus();
      const cardWrapper = dragDom.closest('.tool-card-wrapper') as HTMLDivElement;
      if (!cardWrapper) return;

      // visual feedback for dragging
      cardWrapper.style.opacity = '0.9';
      cardWrapper.style.transform = 'scale(1.02)';
      cardWrapper.style.boxShadow = '0 12px 24px rgba(0,0,0,0.15)';
      cardWrapper.style.outline = '2px solid var(--primary-accent-color)';
      cardWrapper.style.zIndex = '100';

      const container = document.querySelector('.tools-list-container') as HTMLDivElement;
      if (!container) return;

      const cards = container.querySelectorAll('.tool-card-wrapper') as NodeListOf<HTMLDivElement>;
      if (cards.length <= 1) return;
      const rect = container.getBoundingClientRect();
      const relativeY = clientY - rect.top + container.scrollTop;

      let index = -1;
      for (let i = 0; i < cards.length; i++) {
        const cardTop = cards[i].offsetTop;
        const cardBottom = cardTop + cards[i].offsetHeight;
        if (relativeY >= cardTop && relativeY <= cardBottom) {
          index = i;
          break;
        }
      }

      if (index >= 0) {
        const targetCard = cards[index];
        if (cardWrapper !== targetCard) {
          let index2 = -1;
          for (let i = 0; i < cards.length; i++) {
            if (cards[i] === cardWrapper) {
              index2 = i;
              break;
            }
          }
          if (index2 >= 0) {
            if (index2 < index) {
              targetCard.parentNode?.insertBefore(cardWrapper, targetCard.nextSibling);
            } else {
              targetCard.parentNode?.insertBefore(cardWrapper, targetCard);
            }
          }
        }
      }
      // Set grabbed amount explicitly to avoid triggering any click events later
      draggedAmount = 100;
    }
  });

  dragUtil.setOnMoveEndCallback(() => {
    const dragDom = dragUtil.getDraggingDom();
    if (!dragDom) return;

    if (dragDom.classList.contains('tool-card')) {
      let x = 0;
      const match = dragDom.style.transform.match(/translateX\(([-\d\.]+)px\)/);
      if (match) x = parseFloat(match[1]);

      let snapX = 0;
      const actionLayer = dragDom.previousElementSibling as HTMLDivElement;
      let maxSwipe = -100;
      if (actionLayer && actionLayer.classList.contains('tool-card-actions-layer')) {
        maxSwipe = -(actionLayer.children.length * 50);
      }
      if (x < maxSwipe / 2) {
        snapX = maxSwipe;
      }

      dragDom.style.transform = `translateX(${snapX}px)`;
      if (actionLayer && actionLayer.classList.contains('tool-card-actions-layer') && snapX === 0) {
        actionLayer.style.opacity = '0';
      }
    } else if (dragDom.classList.contains('drag-handle')) {
      const cardWrapper = dragDom.closest('.tool-card-wrapper') as HTMLDivElement;
      if (cardWrapper) {
        cardWrapper.style.opacity = '1';
        cardWrapper.style.transform = 'scale(1)';
        cardWrapper.style.boxShadow = 'none';
        cardWrapper.style.outline = 'none';
        cardWrapper.style.zIndex = '';
      }

      const container = document.querySelector('.tools-list-container') as HTMLDivElement;
      if (!container) return;
      const cards = container.querySelectorAll('.tool-card') as NodeListOf<HTMLDivElement>;
      const newOrderIds: string[] = [];
      cards.forEach((c) => {
        const id = c.getAttribute('data-id');
        if (id) newOrderIds.push(id);
      });
      if (newOrderIds.length > 0) {
        LocalToolsService.reorderItems(newOrderIds);
        currentItems = LocalToolsService.getItems();
      }
    }
  });

  const renderContentDaysMatter = (item: Partial<ToolItem>) => {
    const dm = item.daysMatter;
    if (!dm) return <div class='tool-content' style={{ paddingLeft: '8px' }}><div class='tool-title'>{item.title}</div></div>;

    return (
      <div class='tool-content' style={{ paddingLeft: '8px' }}>
        <div class='tool-title'>{item.title}</div>
        <div class='tool-subtitle'>
          {dm.targetDate} ({dm.cycle})
        </div>
      </div>
    );
  };

  const renderContentHabit = (item: Partial<ToolItem>) => {
    const isCheckedIn = LocalToolsService.isHabitCheckedInToday(item.habit!);
    const consecutive = LocalToolsService.getHabitStreak(item.habit!);
    return (
      <div class='tool-content' style={{ paddingLeft: '8px' }}>
        <div class='tool-title'>{item.title}</div>
        <div class={'tool-subtitle ' + (!isCheckedIn ? 'habit-warning' : 'habit-success')}>
          {isCheckedIn ? `Checked in! Streak: ${consecutive} day(s)` : `Not checked in. Streak: ${consecutive} day(s)`}
        </div>
      </div>
    );
  };

  const renderContentTodo = (item: Partial<ToolItem>) => {
    const isComp = item.todo?.isCompleted;
    return (
      <div class={'tool-content ' + (isComp ? 'todo-completed' : '')} style={{ paddingLeft: '8px', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px', minWidth: 0 }}>
          <i
            class={`ifc-icon checkbox-icon ${isComp ? 'ma-checkbox-marked' : 'ma-checkbox-blank-outline'}`}
            style={{ flexShrink: 0, width: '16px', height: '16px' }}
            onClick={(e) => onToggleTodo(item, e as Event)}
          />
          <div class='tool-title' style={{ marginBottom: 0, flex: 1, minWidth: 0 }}>
            {item.title}
          </div>
        </div>
        {item.todo?.description && <div class='tool-subtitle'>{item.todo.description}</div>}
      </div>
    );
  };

  const renderContentFocus = (item: Partial<ToolItem>) => {
    const duration = item.focus?.durationMinutes || 30;
    const durationSec = duration * 60;
    const remaining = item.focus?.remainingSeconds;

    let timeStr = `${duration}`;
    if (remaining !== undefined && remaining > 0 && remaining < durationSec) {
      const m = Math.floor(remaining / 60)
        .toString()
        .padStart(2, '0');
      const s = (remaining % 60).toString().padStart(2, '0');
      timeStr = `${duration} (${m}:${s})`;
    }

    return (
      <div class='tool-content flex-row items-center flex-gap-12' style={{ paddingLeft: '8px' }}>
        <div class='flex-col flex-1 min-w-0'>
          <div class='tool-title'>{item.title}</div>
          <div class='tool-subtitle'>
            {timeStr} Minute(s) - {item.focus?.animationTheme}
          </div>
        </div>
      </div>
    );
  };

  const renderRightContent = (item: Partial<ToolItem>) => {
    if (item.type === 'days_matter') {
      if (!item.daysMatter || !item.daysMatter.targetDate) return null;
      
      const remaining = LocalToolsService.calculateDaysToTarget(item.daysMatter.targetDate, item.daysMatter.cycle || 'none');
      if (remaining < 0) {
        return <div class='days-matter-past'>Passed</div>;
      }

      let colorClass = 'days-matter-normal';
      if (remaining === 0) {
        colorClass = 'days-matter-urgent';
      } else if (remaining <= 3) {
        colorClass = 'days-matter-warning';
      }

      return (
        <div class={colorClass}>
          {remaining} <span style={{ fontSize: '12px', fontWeight: 'normal' }}>day(s)</span>
        </div>
      );
    }
    return null; // Todo/Habit/Focus have right content embedded directly
  };

  const renderList = (items: Partial<ToolItem>[]) => {
    return (
      <>
        {items.map((item) => (
          <div class='tool-card-wrapper note-card-wrapper'>
            <div class='tool-card-actions-layer'>
              <div
                class='action-btn edit-btn'
                onClick={(e) => {
                  e.stopPropagation();
                  onEditTool(item, e);
                }}
              >
                <i class='ifc-icon ma-pencil-outline' />
              </div>
              <div
                class='action-btn delete-btn'
                onClick={(e) => {
                  onDeleteTool(item.id!, e);
                }}
              >
                <i class='ifc-icon ma-delete-off-outline' />
              </div>
            </div>
            <div
              class='tool-card'
              data-id={item.id}
              style={{ borderLeft: item.color ? `6px solid ${item.color}` : '6px solid transparent' }}
              onMouseDown={(e) => {
                resetSwipeMenus(item.id!);
                draggedAmount = 0;
                dragUtil.onMouseDown(e);
              }}
              onTouchStart={(e) => {
                resetSwipeMenus(item.id!);
                draggedAmount = 0;
                dragUtil.onTouchStart(e);
              }}
              onClick={(e) => onClickCard(item, e)}
            >
              {(() => {
                const cat = TOOL_CATEGORIES.find((c) => c.id === item.type);
                if (!cat) return null;
                return (
                  <i
                    class={`ifc-icon ${cat.icon}`}
                    style={{
                      position: 'absolute',
                      top: '27px',
                      right: '6px',
                      width: '18px',
                      height: '18px',
                      color: cat.color,
                      opacity: 0.6,
                      pointerEvents: 'none',
                    }}
                  />
                );
              })()}

              {item.type === 'days_matter' && renderContentDaysMatter(item)}
              {item.type === 'habit' && renderContentHabit(item)}
              {item.type === 'todo' && renderContentTodo(item)}
              {item.type === 'focus' && renderContentFocus(item)}

              <div class='tool-card-right'>{renderRightContent(item)}</div>

              <div
                class='drag-handle'
                onMouseDown={(e) => {
                  e.stopPropagation();
                  dragUtil.onMouseDown(e);
                }}
                onTouchStart={(e) => {
                  e.stopPropagation();
                  dragUtil.onTouchStart(e);
                }}
              >
                <i class='ifc-icon bs-list' />
              </div>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div style={{ textAlign: 'center', marginTop: '48px', color: 'var(--secondary-color)' }}>
            No tools created yet.
            <br />
            Tap the + button to add one!
          </div>
        )}
      </>
    );
  };

  const ref: RefProps = {
    onLoad: async () => {
      await StorageManager.waitForInit();
      loadData();
    },
  };

  return (
    <div
      css={css}
      ref={ref}
      onMouseDown={handleBgTouch}
      onTouchStart={handleBgTouch}
      onMouseMove={dragUtil.onMouseMove}
      onMouseUp={dragUtil.onMouseUp}
      onTouchMove={dragUtil.onTouchMove}
      onTouchEnd={dragUtil.onTouchEnd}
    >
      <MobileHeaderCenter>
        <MobileHeaderTitleIcon
          title='Tools'
          left={<MobileHeaderEmptyIcon />}
          right={
            <div class='flex-center-gap-12'>
              <MobileTopSysIcon />
            </div>
          }
        />
      </MobileHeaderCenter>

      <div class='tools-scroll tools-list-container no-scrollbar-container'>
        <SliderFrame
          hook={sliderFrameHook}
          afterClose={async () => {
            resetSwipeMenus();
            loadData();
          }}
        />
        {dom.node}
      </div>

      <div class='fab-button' onClick={onAddTool}>
        <span class='fab-icon'>+</span>
      </div>
    </div>
  );
};
