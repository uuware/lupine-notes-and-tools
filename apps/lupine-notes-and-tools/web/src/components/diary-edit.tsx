import {
  CssProps,
  NotificationColor,
  NotificationMessage,
  RefProps,
  SliderFrameHookProps,
  HeaderWithBackFrame,
  ActionSheetColorPicker,
} from 'lupine.components';
import { LocalDiaryProps, LocalDiaryService } from '../services/local-diary-service';

export const DiaryEditComponent = (props: {
  date: string;
  diary?: LocalDiaryProps;
  sliderFrameHook: SliderFrameHookProps;
  onSaved: () => void;
}) => {
  const isEdit = !!props.diary;
  const diaryId = props.diary ? props.diary.id : -1;
  const defaultTitle = props.diary ? props.diary.title : '';
  const defaultContent = props.diary ? props.diary.content : '';

  const ref: RefProps = {
    onLoad: async () => {
      if (!isEdit) {
        const tInput = ref.$('.diary-edit-title-input') as HTMLInputElement;
        tInput?.focus();
      }
    },
  };

  let selectedColor = props.diary?.color || '';

  const pickColor = async () => {
    const res = await ActionSheetColorPicker({
      value: selectedColor,
      title: 'Select Color Tag',
    });
    if (res !== undefined) {
      selectedColor = res;
      const ind = ref.$('.diary-color-preview') as HTMLDivElement;
      if (ind) ind.style.backgroundColor = res || 'transparent';
    }
  };

  const onSave = () => {
    const title = (ref.$('.diary-edit-title-input') as HTMLInputElement).value.trim();
    const content = (ref.$('.diary-edit-body-input') as HTMLTextAreaElement).value.trim();

    if (!title) {
      NotificationMessage.sendMessage('Please enter a title', NotificationColor.Error);
      return;
    }

    LocalDiaryService.saveDiary({
      id: diaryId,
      date: props.date,
      title,
      content,
      color: selectedColor,
      updatedAt: Date.now(),
    });

    NotificationMessage.sendMessage(isEdit ? 'Modified and saved' : 'Diary added', NotificationColor.Success);
    props.onSaved();
    props.sliderFrameHook.close!(new MouseEvent('click'));
  };

  const css: CssProps = {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: 'var(--primary-bg-color)',
    padding: '16px',

    '.diary-edit-title-input': {
      width: '100%',
      fontSize: '20px',
      fontWeight: 'bold',
      padding: '8px',
      backgroundColor: 'transparent',
      color: 'var(--primary-color)',
      outline: 'none',
      marginBottom: '16px',
      '&:focus': {
        borderBottomColor: '#eb2f96', // Pink theme
      },
    },
    '.diary-edit-body-input': {
      flex: 1,
      padding: '12px',
      backgroundColor: 'transparent',
      color: 'var(--primary-color)',
      fontSize: '16px',
      resize: 'none',
      outline: 'none',
      lineHeight: '1.6',
    },
    '.diary-edit-color-row': {
      display: 'flex',
      alignItems: 'center',
      padding: '12px',
      cursor: 'pointer',
      backgroundColor: 'var(--secondary-bg-color)',
      borderRadius: '8px',
      marginBottom: '16px',
      color: 'var(--primary-color)',
      fontWeight: 'bold',
      fontSize: '16px',
    },
    '.diary-header-save': {
      color: '#eb2f96',
      fontWeight: 'bold',
      fontSize: '16px',
      padding: '0 8px',
      cursor: 'pointer',
    },
    '.diary-date-label': {
      color: 'var(--secondary-color)',
      padding: '0 8px 12px 8px',
      fontSize: '14px',
    },
    '.diary-color-preview-box': {
      width: '20px',
      height: '20px',
      borderRadius: '4px',
      border: '1px solid var(--primary-border-color)',
    },
    '.diary-color-pencil': {
      fontSize: '14px',
      marginLeft: '8px',
      color: 'var(--secondary-color)',
    },
  };

  return (
    <HeaderWithBackFrame
      title={isEdit ? 'Edit Diary' : 'New Diary'}
      onBack={(e: Event) => props.sliderFrameHook.close!(e)}
      right={
        <div onClick={onSave} class='diary-header-save'>
          Save
        </div>
      }
    >
      <div ref={ref} css={css} class='diary-edit-container flex-col h-100'>
        <div class='diary-date-label'>Date: {props.date}</div>
        <input
          type='text'
          class='input-base diary-edit-title-input'
          placeholder='Title...'
          value={defaultTitle}
          maxLength={50}
        />
        <div class='diary-edit-color-row' onClick={pickColor}>
          <div class='flex-1'>Color Tag</div>
          <div
            class='diary-color-preview diary-color-preview-box'
            style={{ backgroundColor: selectedColor || 'transparent' }}
          ></div>
          <i class='ifc-icon ma-pencil-outline diary-color-pencil' />
        </div>
        <textarea class='input-base diary-edit-body-input' placeholder='Write your diary...'>
          {defaultContent}
        </textarea>
      </div>
    </HeaderWithBackFrame>
  );
};
