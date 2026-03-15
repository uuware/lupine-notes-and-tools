import { CssProps, HeaderWithBackFrame, SliderFrameHookProps, ActionSheetSelect } from 'lupine.components';
import { ToolItem, LocalToolsService } from '../services/local-tools-service';

export const ToolsDaysMatterPage = (props: {
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
      title: 'Delete this date event?',
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

  const calculateDays = () => {
    if (!props.item.daysMatter?.targetDate) return { days: 0, isPast: false };
    const remaining = LocalToolsService.calculateDaysToTarget(
      props.item.daysMatter.targetDate,
      props.item.daysMatter.cycle
    );
    if (remaining < 0) {
      return { days: Math.abs(remaining), isPast: true };
    }
    return { days: remaining, isPast: false };
  };

  const { days, isPast } = calculateDays();

  const cycleMap: Record<string, string> = {
    'one-off': 'Once',
    monthly: 'Monthly',
    yearly: 'Yearly',
  };
  const cycleText = cycleMap[props.item.daysMatter?.cycle || 'one-off'];

  const css: CssProps = {
    flex: 1,
    overflowY: 'auto',
    backgroundColor: 'var(--primary-bg-color)',
    padding: '32px 16px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',

    '.dm-title': {
      fontSize: '24px',
      fontWeight: 'bold',
      color: 'var(--primary-color)',
      marginBottom: '16px',
      textAlign: 'center',
    },
    '.dm-target-date': {
      fontSize: '18px',
      color: 'var(--secondary-color)',
      marginBottom: '48px',
    },
    '.dm-status': {
      fontSize: '20px',
      color: 'var(--primary-color)',
      marginBottom: '24px',
    },
    '.dm-days-number': {
      fontSize: '80px',
      fontWeight: 'bold',
      lineHeight: '1',
      color: 'var(--primary-accent-color)',
      marginBottom: '24px',
      fontFamily: 'monospace',
    },
    '.dm-cycle-tag': {
      padding: '4px 12px',
      borderRadius: '16px',
      backgroundColor: 'var(--secondary-bg-color)',
      color: 'var(--primary-color)',
      fontSize: '14px',
      fontWeight: 'bold',
      marginTop: '16px',
    },
    '.flex-col-center': {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
    },
  };

  return (
    <HeaderWithBackFrame title='Days Matter' onBack={(e: Event) => props.sliderFrameHook.close!(e)} right={pageRight}>
      <div css={css} class='flex-col h-100'>
        <div class='flex-col-center'>
          <div class='dm-title'>{props.item.title}</div>
          <div class='dm-target-date'>{props.item.daysMatter?.targetDate}</div>

          <div class='dm-days-number'>{days}</div>
          <div class='dm-status'>Day(s) {isPast ? 'Passed' : 'Left'}</div>

          <div class='dm-cycle-tag'>Repeats: {cycleText}</div>
        </div>
      </div>
    </HeaderWithBackFrame>
  );
};
