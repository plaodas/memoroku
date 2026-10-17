import { Platform } from 'react-native';

import { getRecentReadyMemos } from '../storage/memos';
import { widgetLine } from './sentence';

export type WidgetMemo = {
  text: string;
  memoId: string;
};

type MemoWidgetInstance = {
  updateSnapshot(props: { memos: WidgetMemo[] }): void;
};

type WidgetBridgeModule = {
  setMemos(memosJson: string): void;
};

export async function publishLatestMemo(): Promise<void> {
  const ready = await getRecentReadyMemos(3);
  const memos = ready.flatMap((memo) => {
    const text = memo.transcript ? widgetLine(memo.transcript) : '';
    return text ? [{ text, memoId: memo.id }] : [];
  });
  if (Platform.OS === 'ios') {
    const widget = require('./MemoWidget').default as MemoWidgetInstance;
    widget.updateSnapshot({ memos });
    return;
  }
  const bridge = require('../../native-modules/widget').WidgetBridge as WidgetBridgeModule;
  bridge.setMemos(JSON.stringify(memos));
}
