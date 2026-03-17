import {
  CssProps,
  HeaderWithBackFrame,
  RefProps,
  SliderFrameHookProps,
  NotificationMessage,
  NotificationColor,
  HtmlVar,
  ActionSheetDatePicker,
  ActionSheetTimePicker,
  ActionSheetColorPicker,
} from 'lupine.components';
import { LocalFinanceProps, FinanceItemProps, LocalFinanceService } from '../services/local-finance-service';

export const FinanceEditComponent = (props: {
  record?: LocalFinanceProps;
  sliderFrameHook: SliderFrameHookProps;
  onSaved: () => void;
}) => {
  const isEdit = !!props.record;
  const defaultTitle = props.record?.title || '';
  const defaultRemark = props.record?.remark || '';

  const pad = (n: number) => n.toString().padStart(2, '0');
  const now = new Date();
  let currentDate = props.record?.date || `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  let currentTime = props.record?.time || `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  let currentColor = props.record?.color || '#52c41a';

  let currentItems: FinanceItemProps[] = props.record?.items || [
    { amount: '', remark: '' },
    { amount: '', remark: '' },
    { amount: '', remark: '' },
  ];
  if (currentItems.length === 0) {
    currentItems = [
      { amount: '', remark: '' },
      { amount: '', remark: '' },
      { amount: '', remark: '' },
    ];
  }

  const dateDom = new HtmlVar(currentDate);
  const timeDom = new HtmlVar(currentTime);
  const colorDom = new HtmlVar(
    <div style={{ width: '24px', height: '24px', borderRadius: '4px', backgroundColor: currentColor }} />
  );
  let initialTotal = 0;
  if (props.record?.items) {
    props.record.items.forEach((i) => {
      const val = parseFloat(i.amount);
      if (!isNaN(val)) initialTotal += val;
    });
  }
  initialTotal = Math.round(initialTotal * 100) / 100;

  const itemsDom = new HtmlVar('');
  const totalDom = new HtmlVar(initialTotal > 0 ? ` (Total: ${initialTotal})` : '');

  const updateTotal = () => {
    if (!ref.current) return;
    const amounts = ref.current.querySelectorAll('.finance-item-amount') as NodeListOf<HTMLInputElement>;
    let total = 0;
    for (let i = 0; i < amounts.length; i++) {
      const val = parseFloat(amounts[i].value);
      if (!isNaN(val)) total += val;
    }
    const safeTotal = Math.round(total * 100) / 100;
    totalDom.value = safeTotal > 0 ? ` (Total: ${safeTotal})` : '';
  };

  const onRemoveItem = (index: number) => {
    syncItemsFromDom();
    currentItems.splice(index, 1);
    itemsDom.value = renderItems();
    setTimeout(updateTotal, 0); // Need next tick because HtmlVar is synchronous innerHTML
  };

  const onAmountInput = (e: Event) => {
    const target = e.currentTarget as HTMLInputElement;
    if (target.value.length > 11) {
      target.value = target.value.slice(0, 11);
    }
    updateTotal();
  };

  const renderItems = () => {
    return (
      <div class='finance-items-list'>
        {currentItems.map((item, index) => (
          <div class='finance-item-row'>
            <input
              type='number'
              class='input-base finance-item-amount'
              placeholder='Amount'
              value={item.amount}
              data-index={index}
              onInput={onAmountInput}
            />
            <input
              type='text'
              class='input-base finance-item-remark'
              placeholder='Remark'
              value={item.remark}
              data-index={index}
            />
            <div class='finance-item-delete' onClick={() => onRemoveItem(index)}>
              <i class='ifc-icon ma-close' />
            </div>
          </div>
        ))}
        <div class='finance-add-item-btn' onClick={onAddItem}>
          <i class='ifc-icon ma-add finance-add-icon'></i> Add Row
        </div>
      </div>
    );
  };

  const syncItemsFromDom = () => {
    if (!ref.current) return;
    const amounts = ref.current.querySelectorAll('.finance-item-amount') as NodeListOf<HTMLInputElement>;
    const remarks = ref.current.querySelectorAll('.finance-item-remark') as NodeListOf<HTMLInputElement>;
    const newItems: FinanceItemProps[] = [];
    for (let i = 0; i < amounts.length; i++) {
      newItems.push({
        amount: amounts[i].value,
        remark: remarks[i].value,
      });
    }
    currentItems = newItems;
  };

  const onAddItem = () => {
    syncItemsFromDom();
    currentItems.push({ amount: '', remark: '' });
    itemsDom.value = renderItems();
  };

  const pickDate = async () => {
    const res = await ActionSheetDatePicker({
      title: 'Select Date',
      value: currentDate,
      order: 'YMD',
    });
    if (res) {
      currentDate = res;
      dateDom.value = currentDate;
    }
  };

  const pickTime = async () => {
    const res = await ActionSheetTimePicker({
      title: 'Select Time',
      value: currentTime,
      showSeconds: false,
    });
    if (res) {
      currentTime = res;
      timeDom.value = currentTime;
    }
  };

  const pickColor = async () => {
    const res = await ActionSheetColorPicker({
      title: 'Select Color tag',
      value: currentColor,
    });
    if (res) {
      currentColor = res;
      colorDom.value = (
        <div style={{ width: '24px', height: '24px', borderRadius: '4px', backgroundColor: currentColor }} />
      );
    }
  };

  const onSave = async () => {
    if (!ref.current) return;
    const titleVal = (ref.current.querySelector('.finance-edit-title-input') as HTMLInputElement)?.value || '';
    const remarkVal = (ref.current.querySelector('.finance-edit-remark-input') as HTMLTextAreaElement)?.value || '';

    syncItemsFromDom();

    if (!titleVal.trim() && currentItems.every((i) => !i.amount.trim() && !i.remark.trim())) {
      NotificationMessage.sendMessage('Please fill in at least a title or an amount', NotificationColor.Warning);
      return;
    }

    const newRecord: Partial<LocalFinanceProps> = {
      title: titleVal.trim(),
      remark: remarkVal.trim(),
      date: currentDate,
      time: currentTime,
      color: currentColor,
      items: currentItems.filter((i) => i.amount.trim() !== '' || i.remark.trim() !== ''),
    };

    if (isEdit) {
      newRecord.id = props.record!.id;
      newRecord.orderIndex = props.record!.orderIndex;
    }

    LocalFinanceService.saveRecord(newRecord);
    NotificationMessage.sendMessage('Saved successfully', NotificationColor.Success);

    if (props.onSaved) props.onSaved();
    props.sliderFrameHook.close!(new MouseEvent('click'));
  };

  const ref: RefProps & { current?: HTMLElement } = {
    onLoad: async (el) => {
      ref.current = el as HTMLElement;
      itemsDom.value = renderItems();
    },
  };

  const css: CssProps = {
    '.finance-edit-container': {
      padding: '16px',
      overflowY: 'auto',
      backgroundColor: 'var(--secondary-bg-color)',
    },
    '.finance-section': {
      backgroundColor: 'var(--primary-bg-color)',
      borderRadius: '8px',
      padding: '12px 16px',
      marginBottom: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    },
    '.finance-prop-row': {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '8px 0',
      borderBottom: '1px solid var(--primary-border-color)',
      cursor: 'pointer',
    },
    '.finance-prop-row:last-child': {
      borderBottom: 'none',
      paddingBottom: 0,
    },
    '.finance-prop-label': {
      color: 'var(--primary-color)',
      fontSize: '16px',
      display: 'flex',
      alignItems: 'center',
    },
    '.finance-item-delete i': {
      fontSize: '16px',
    },
    '.finance-add-item-btn': {
      padding: '12px 16px',
      color: 'var(--primary-accent-color)',
      fontWeight: 'bold',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      cursor: 'pointer',
    },
    '.finance-add-icon': {
      fontSize: '20px',
    },
    '.finance-total-label': {
      fontWeight: 'bold',
      marginBottom: '8px',
      color: 'var(--primary-color)',
      display: 'flex',
      alignItems: 'center',
    },
    '.finance-total-value': {
      color: 'var(--secondary-color)',
      fontWeight: 'normal',
      fontSize: '14px',
      marginLeft: '4px',
    },
    '.finance-header-save': {
      padding: '0 16px',
      color: 'var(--primary-accent-color)',
      cursor: 'pointer',
      fontWeight: 'bold',
    },
    '.finance-color-option': {
      width: '24px',
      height: '24px',
      borderRadius: '6px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    '.finance-prop-value': {
      color: 'var(--secondary-color)',
      fontSize: '16px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    '.finance-item-row': {
      display: 'flex',
      gap: '12px',
      marginBottom: '12px',
    },
    '.finance-item-amount': {
      flex: 1,
      minWidth: 0,
    },
    '.finance-item-remark': {
      flex: 1,
      minWidth: 0,
    },
    '.finance-edit-remark-input': {
      minHeight: '80px',
      resize: 'none',
      width: '100%',
    },
  };

  return (
    <HeaderWithBackFrame
      title={isEdit ? 'Edit Finance' : 'Add Finance'}
      onBack={(e: Event) => props.sliderFrameHook.close!(e)}
      right={
        <div class='finance-header-save' onClick={onSave}>
          Save
        </div>
      }
    >
      <div ref={ref} css={css} class='finance-edit-container flex-col h-100'>
        <div class='finance-section'>
          <input
            type='text'
            class='input-base finance-edit-title-input'
            placeholder='Title...'
            value={defaultTitle}
            maxLength={50}
          />
        </div>

        <div class='finance-section'>
          <div class='finance-prop-row' onClick={pickDate}>
            <div class='finance-prop-label'>
              <i class='ifc-icon icon-date' style={{ marginRight: '8px', fontSize: '18px' }} />
              Date
            </div>
            <div class='finance-prop-value'>
              {dateDom.node} <i class='ifc-icon ma-pencil-outline' style={{ fontSize: '14px' }} />
            </div>
          </div>
          <div class='finance-prop-row' onClick={pickTime}>
            <div class='finance-prop-label'>
              <i class='ifc-icon icon-time' style={{ marginRight: '8px', fontSize: '18px' }} />
              Time
            </div>
            <div class='finance-prop-value'>
              {timeDom.node} <i class='ifc-icon ma-pencil-outline icon-14' />
            </div>
          </div>
          <div class='finance-prop-row' onClick={pickColor}>
            <div class='finance-prop-label'>
              <i class='ifc-icon icon-color' style={{ marginRight: '8px', fontSize: '18px' }} />
              Color Tag
            </div>
            <div class='finance-prop-value'>
              {colorDom.node} <i class='ifc-icon ma-pencil-outline icon-14' />
            </div>
          </div>
        </div>

        <div class='finance-section'>
          <div class='finance-total-label'>
            <i class='ifc-icon bs-list' style={{ marginRight: '8px', fontSize: '18px' }} />
            Items <span class='finance-total-value'>{totalDom.node}</span>
          </div>
          {itemsDom.node}
        </div>

        <div class='finance-section'>
          <textarea class='input-base finance-edit-remark-input' placeholder='Add a remark...'>
            {defaultRemark}
          </textarea>
        </div>
      </div>
    </HeaderWithBackFrame>
  );
};
