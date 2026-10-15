import { requireNativeModule } from 'expo';

type WidgetBridgeModule = {
  setLatestMemo(text: string, memoId: string): void;
};

export const WidgetBridge = requireNativeModule<WidgetBridgeModule>('WidgetBridge');
