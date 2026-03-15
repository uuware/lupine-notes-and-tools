import {
  CssProps,
  HeaderWithBackFrame,
  SliderFrameHookProps,
  ActionSheetSelect,
  ToggleSwitch,
  ToggleSwitchSize,
  HtmlVar,
  RefProps,
} from 'lupine.components';
import { ToolItem, LocalToolsService } from '../services/local-tools-service';

export const ToolsTodoPage = (props: {
  item: ToolItem;
  sliderFrameHook: SliderFrameHookProps;
  onEdit?: (item: ToolItem) => void;
  onDelete?: (id: string) => void;
}) => {
  const onEdit = () => {
    if (props.onEdit) props.onEdit(props.item);
  };

  const onDelete = async () => {
    await ActionSheetSelect.show({
      title: 'Delete this to-do?',
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

  const pageRight = (
    <div class='flex-center-gap-12'>
      <i class='ifc-icon ma-pencil-outline icon-24-pointer' onClick={onEdit}></i>
      <i class='ifc-icon ma-delete-off-outline icon-24-pointer color-red' onClick={onDelete}></i>
    </div>
  );

  const css: CssProps = {
    flex: 1,
    overflowY: 'auto',
    backgroundColor: 'var(--primary-bg-color)',
    padding: '24px 16px',

    '.todo-title': {
      fontSize: '24px',
      fontWeight: 'bold',
      color: 'var(--primary-color)',
      marginBottom: '16px',
    },
    '.todo-description-label': {
      fontSize: '14px',
      color: 'var(--secondary-color)',
      fontWeight: 'bold',
      marginBottom: '8px',
    },
    '.todo-description': {
      fontSize: '16px',
      color: 'var(--primary-color)',
      lineHeight: '1.5',
      whiteSpace: 'pre-wrap',
      backgroundColor: 'var(--secondary-bg-color)',
      padding: '16px',
      borderRadius: '8px',
      marginBottom: '32px',
    },
    '.todo-status-row': {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px',
      backgroundColor: 'var(--secondary-bg-color)',
      borderRadius: '8px',
    },
    '.todo-status-text': {
      fontSize: '16px',
      color: 'var(--primary-color)',
      fontWeight: 'bold',
    },
  };

  const switchDom = new HtmlVar('');
  const statusDom = new HtmlVar('');

  const refreshState = () => {
    const isCompleted = props.item.todo?.isCompleted || false;

    switchDom.value = (
      <ToggleSwitch
        size={ToggleSwitchSize.Medium}
        checked={isCompleted}
        disabled={false}
        onClick={(v) => {
          const cloned = { ...props.item };
          cloned.todo!.isCompleted = v;
          LocalToolsService.updateItem(cloned);
          props.item.todo!.isCompleted = v;
          refreshState();
        }}
      />
    );

    statusDom.value = <div class='todo-status-text'>{isCompleted ? 'Completed' : 'Pending'}</div>;
  };

  const ref: RefProps = {
    onLoad: async () => {
      refreshState();
    },
  };

  return (
    <HeaderWithBackFrame title='To-Do Detail' onBack={(e: Event) => props.sliderFrameHook.close!(e)} right={pageRight}>
      <div css={css} ref={ref} class='flex-col h-100'>
        <div class='todo-title'>{props.item.title}</div>

        {props.item.todo?.description && (
          <div>
            <div class='todo-description-label'>Description</div>
            <div class='todo-description'>{props.item.todo.description}</div>
          </div>
        )}

        <div class='todo-status-row'>
          {statusDom.node}
          {switchDom.node}
        </div>
      </div>
    </HeaderWithBackFrame>
  );
};
