import { CssProps, RefProps, SliderFrameHookProps, HeaderWithBackFrame, ActionSheetSelect } from 'lupine.components';
import { LocalDiaryProps, LocalDiaryService } from '../services/local-diary-service';
import { DiaryEditComponent } from './diary-edit';

interface DiaryDetailProps {
  diary: LocalDiaryProps;
  sliderFrameHook: SliderFrameHookProps;
  onSaved: () => void;
}

export const DiaryDetailComponent = async (props: DiaryDetailProps) => {
  const css: CssProps = {
    flex: 1,
    overflowY: 'auto',
    padding: '24px',
    backgroundColor: 'var(--primary-bg-color)',

    '.diary-detail-title': {
      fontSize: '24px',
      fontWeight: 'bold',
      color: 'var(--primary-color)',
      marginBottom: '12px',
      lineHeight: '1.4',
    },
    '.diary-detail-date': {
      fontSize: '13px',
      color: 'var(--secondary-color)',
    },
    '.diary-detail-meta': {
      display: 'flex',
      gap: '12px',
      alignItems: 'center',
      marginBottom: '24px',
      paddingBottom: '16px',
      borderBottom: '1px solid var(--primary-border-color)',
    },
    '.diary-detail-content': {
      fontSize: '16px',
      color: 'var(--primary-color)',
      lineHeight: '1.6',
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word',
    },
    '.header-action-icon': {
      fontSize: '20px',
      padding: '4px',
      cursor: 'pointer',
      color: 'var(--primary-color)',
    },
    '.header-actions-container': {
      display: 'flex',
      gap: '16px',
      alignItems: 'center',
    },
    '.header-action-delete': {
      color: '#ff4d4f',
    },
    '.diary-detail-color-marker': {
      width: '16px',
      height: '16px',
      borderRadius: '4px',
    },
  };

  const onEdit = () => {
    props.sliderFrameHook.load!(
      <DiaryEditComponent
        date={props.diary.date}
        diary={props.diary}
        sliderFrameHook={props.sliderFrameHook}
        onSaved={props.onSaved}
      />
    );
  };

  const onDelete = async () => {
    await ActionSheetSelect.show({
      title: 'Are you sure you want to delete this diary?',
      options: ['Remove'],
      cancelButtonText: 'Cancel',
      handleClicked: async (index: number, close: () => void) => {
        close();
        if (index === 0) {
          LocalDiaryService.deleteDiary(props.diary.id);
          props.onSaved();
          props.sliderFrameHook.close!(new MouseEvent('click'));
        }
      },
    });
  };

  const pageRight = (
    <div class='header-actions-container'>
      <i class='ifc-icon ma-pencil-outline header-action-icon' onClick={onEdit}></i>
      <i class='ifc-icon ma-delete-off-outline header-action-icon header-action-delete' onClick={onDelete}></i>
    </div>
  );

  return (
    <HeaderWithBackFrame title='Diary Reading' onBack={(e: Event) => props.sliderFrameHook.close!(e)} right={pageRight}>
      <div css={css} class='diary-detail-wrapper no-scrollbar-container flex-col h-100'>
        <div class='diary-detail-title'>{props.diary.title}</div>
        <div class='diary-detail-meta'>
          {props.diary.color && (
            <div class='diary-detail-color-marker' style={{ backgroundColor: props.diary.color }}></div>
          )}
          <div class='diary-detail-date'>{props.diary.date}</div>
        </div>
        <div class='diary-detail-content'>{props.diary.content}</div>
      </div>
    </HeaderWithBackFrame>
  );
};
