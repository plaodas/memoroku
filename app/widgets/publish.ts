import { Platform } from 'react-native';

import { getLatestReadyMemo } from '../storage/memos';
import { firstSentence } from './sentence';

type MemoWidgetInstance = {
  updateSnapshot(props: { text: string; memoId: string }): void;
};

type WidgetBridgeModule = {
  setLatestMemo(text: string, memoId: string): void;
};

export async function publishLatestMemo(): Promise<void> {
  const latest = await getLatestReadyMemo();
  const text = latest?.transcript ? firstSentence(latest.transcript) : '';
  const memoId = latest?.id ?? '';
  if (Platform.OS === 'ios') {
    const widget = require('./MemoWidget').default as MemoWidgetInstance;
    widget.updateSnapshot({ text, memoId });
    return;
  }
  const bridge = require('../../native-modules/widget').WidgetBridge as WidgetBridgeModule;
  bridge.setLatestMemo(text, memoId);
}
