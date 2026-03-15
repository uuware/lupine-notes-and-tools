import { CssProps, HtmlVar, PageProps, RefProps, SliderFrameHookProps, HeaderWithBackFrame } from 'lupine.components';
import { SearchInputHookProps } from './search-input';
import { SearchInput } from './search-input';
import { InputHistoryComponent, addHistoryItem, clearHistoryList } from './input-history-component';
import { LocalFinanceProps, LocalFinanceService } from '../services/local-finance-service';
import { FinanceDetailComponent } from './finance-detail';

const SEARCH_HISTORY_KEY = 'finance_search_history';

const extractText = (html: string) => {
  const tmp = document.createElement('DIV');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
};

export const FinanceSearchComponent = (props: { sliderFrameHook: SliderFrameHookProps }) => {
  const searchResultsDom = new HtmlVar('');
  const historyDom = new HtmlVar('');
  const searchInputHook: SearchInputHookProps = {};

  const showHistory = () => {
    historyDom.value = (
      <InputHistoryComponent
        historyKey={SEARCH_HISTORY_KEY}
        onItemClick={(item) => {
          searchInputHook.setValue && searchInputHook.setValue(item);
          onSearchQuery(item);
        }}
        onClearHistory={() => {
          clearHistoryList(SEARCH_HISTORY_KEY);
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

    if (!query) {
      searchResultsDom.value = '';
      showHistory();
      return;
    }

    addHistoryItem(SEARCH_HISTORY_KEY, query);
    hideHistory();

    const allRecords = LocalFinanceService.getAllRecords();
    const filteredRecords = allRecords.filter(
      (n) => n.title.toLowerCase().includes(query.toLowerCase()) || n.remark.toLowerCase().includes(query.toLowerCase())
    );

    if (filteredRecords.length === 0) {
      searchResultsDom.value = <div class='note-empty-state'>No record results found</div>;
      return;
    }

    searchResultsDom.value = (
      <div class='note-list-container' style={{ position: 'relative' }}>
        {filteredRecords.map((record) => {
          let totalAmount = 0;
          if (record.items) {
            record.items.forEach((item) => {
              if (!isNaN(parseFloat(item.amount))) {
                totalAmount += parseFloat(item.amount);
              }
            });
          }

          return (
            <div class='note-card-wrapper'>
              <div
                class='note-card row-box'
                style={{ borderLeft: `8px solid ${record.color || 'transparent'}` }}
                onClick={() => {
                  props.sliderFrameHook.load!(
                    <FinanceDetailComponent
                      record={record}
                      sliderFrameHook={props.sliderFrameHook}
                      onSaved={() => {}}
                    />
                  );
                }}
              >
                <div class='note-card-content flex-1' style={{ minWidth: 0 }}>
                  <div class='note-card-title'>{record.title || 'Finance Record'}</div>
                  <div class='note-card-preview ellipsis'>{extractText(record.remark)}</div>
                  <div class='note-card-date'>
                    {record.date} {record.time} | Total: {totalAmount}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const onClearSearch = () => {
    onSearchQuery('');
  };

  const ref: RefProps = {
    onLoad: async () => {
      showHistory();
      // focus input
      const input = ref.current?.querySelector('.search-in-input') as HTMLInputElement | null;
      if (input) {
        requestAnimationFrame(() => input.focus());
      }
    },
  };

  // adding current ref to store dom
  (ref as any).current = null;
  const originalOnLoad = ref.onLoad;
  ref.onLoad = async (el) => {
    (ref as any).current = el;
    if (originalOnLoad) await originalOnLoad(el);
  };

  const css: CssProps = {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    position: 'relative',
    backgroundColor: 'var(--secondary-bg-color)',

    '.note-home-scroll': {
      flex: 1,
      overflowY: 'auto',
      padding: '16px',
    },
    '.note-empty-state': {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100px',
      color: 'var(--secondary-color)',
      fontSize: '16px',
    },
    '.note-card': {
      backgroundColor: 'var(--primary-bg-color)',
      borderRadius: '12px',
      padding: '16px',
      cursor: 'pointer',
      alignItems: 'center',
      position: 'relative',
      zIndex: 2,
    },
    '.note-card-title': {
      fontSize: '16px',
      fontWeight: 'bold',
      color: 'var(--primary-color)',
      marginBottom: '4px',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    },
    '.note-card-preview': {
      fontSize: '14px',
      color: 'var(--secondary-color)',
      marginBottom: '6px',
      display: '-webkit-box',
      WebkitLineClamp: 2,
      WebkitBoxOrient: 'vertical',
      overflow: 'hidden',
    },
    '.note-card-date': {
      fontSize: '12px',
      color: 'var(--secondary-color)',
      opacity: 0.8,
    },
  };

  return (
    <HeaderWithBackFrame
      title={
        <SearchInput
          placeholder='Search title or content...'
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
      <div css={css} ref={ref}>
        {historyDom.node}
        <div class='note-home-scroll no-scrollbar-container'>{searchResultsDom.node}</div>
      </div>
    </HeaderWithBackFrame>
  );
};
