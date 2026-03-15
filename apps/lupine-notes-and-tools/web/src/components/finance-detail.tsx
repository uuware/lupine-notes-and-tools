import { CssProps, HeaderWithBackFrame, RefProps, SliderFrameHookProps, ActionSheetSelect } from 'lupine.components';
import { LocalFinanceProps, LocalFinanceService } from '../services/local-finance-service';
import { FinanceEditComponent } from './finance-edit';

export const FinanceDetailComponent = (props: {
  record: LocalFinanceProps;
  sliderFrameHook: SliderFrameHookProps;
  onSaved: () => void;
}) => {
  const { record } = props;

  let totalAmount = 0;
  if (record.items) {
    record.items.forEach((item) => {
      if (!isNaN(parseFloat(item.amount))) {
        totalAmount += parseFloat(item.amount);
      }
    });
  }

  const css: CssProps = {
    '.finance-detail-container': {
      padding: '16px',
      overflowY: 'auto',
      backgroundColor: 'var(--secondary-bg-color)',
    },
    '.finance-section': {
      backgroundColor: 'var(--primary-bg-color)',
      borderRadius: '8px',
      padding: '16px',
      marginBottom: '16px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    },
    '.finance-title': {
      fontSize: '20px',
      fontWeight: 'bold',
      color: 'var(--primary-color)',
      marginBottom: '8px',
    },
    '.finance-meta': {
      fontSize: '14px',
      color: 'var(--secondary-color)',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    },
    '.header-action-icon': {
      fontSize: '20px',
      padding: '4px',
      cursor: 'pointer',
      color: 'var(--primary-color)',
    },
    '.finance-color-tag': {
      width: '16px',
      height: '16px',
      borderRadius: '4px',
    },
    '.finance-items-header': {
      display: 'flex',
      fontWeight: 'bold',
      color: 'var(--primary-color)',
      borderBottom: '1px solid var(--primary-border-color)',
      paddingBottom: '8px',
      marginBottom: '8px',
    },
    '.finance-item-row': {
      display: 'flex',
      padding: '8px 0',
      borderBottom: '1px dashed var(--primary-border-color)',
      color: 'var(--primary-color)',
    },
    '.finance-item-row:last-child': {
      borderBottom: 'none',
    },
    '.finance-col-amount': {
      flex: 1,
      fontWeight: 'bold',
    },
    '.finance-col-remark': {
      flex: 2,
      color: 'var(--secondary-color)',
    },
    '.finance-total': {
      display: 'flex',
      justifyContent: 'flex-end',
      marginTop: '16px',
      fontWeight: 'bold',
      fontSize: '18px',
      color: 'var(--primary-color)',
      borderTop: '1px solid var(--primary-border-color)',
      paddingTop: '12px',
    },
    '.finance-global-remark': {
      marginTop: '8px',
      color: 'var(--primary-color)',
      whiteSpace: 'pre-wrap',
      lineHeight: '1.5',
    },
  };

  const onEdit = () => {
    props.sliderFrameHook.load!(
      <FinanceEditComponent record={record} sliderFrameHook={props.sliderFrameHook} onSaved={props.onSaved} />
    );
  };

  const onDelete = async () => {
    await ActionSheetSelect.show({
      title: 'Are you sure you want to delete this record?',
      options: ['Remove'],
      cancelButtonText: 'Cancel',
      handleClicked: async (index: number, close: () => void) => {
        close();
        if (index === 0) {
          LocalFinanceService.deleteRecord(record.id);
          props.onSaved();
          props.sliderFrameHook.close!(new MouseEvent('click'));
        }
      },
    });
  };

  const pageRight = (
    <div class='finance-actions'>
      <i class='ifc-icon ma-pencil-outline header-action-icon' onClick={onEdit}></i>
      <i class='ifc-icon ma-delete-off-outline header-action-icon finance-action-del' onClick={onDelete}></i>
    </div>
  );

  return (
    <HeaderWithBackFrame title='记账明细' onBack={(e: Event) => props.sliderFrameHook.close!(e)} right={pageRight}>
      <div css={css} class='finance-detail-container flex-col h-100'>
        <div class='finance-section'>
          <div class='finance-title'>{record.title || 'Untitled Transaction'}</div>
          <div class='finance-meta'>
            {record.color && <div class='finance-color-tag' style={{ backgroundColor: record.color }}></div>}
            <div>
              {record.date} {record.time}
            </div>
          </div>
        </div>

        <div class='finance-section'>
          <div class='finance-items-header'>
            <div class='finance-col-amount'>Amount</div>
            <div class='finance-col-remark'>Remark</div>
          </div>
          <div class='finance-items-list'>
            {record.items &&
              record.items.map((item) => (
                <div class='finance-item-row'>
                  <div class='finance-col-amount'>{item.amount || '-'}</div>
                  <div class='finance-col-remark'>{item.remark || '-'}</div>
                </div>
              ))}
          </div>
          <div class='finance-total'>Total: {totalAmount}</div>
        </div>

        {record.remark && (
          <div class='finance-section'>
            <div class='finance-remark-label'>Remark</div>
            <div class='finance-global-remark'>{record.remark}</div>
          </div>
        )}
      </div>
    </HeaderWithBackFrame>
  );
};
