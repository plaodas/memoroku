import { requireNativeModule } from 'expo';

type WidgetBridgeModule = {
  setMemos(memosJson: string): void;
};

export const WidgetBridge = requireNativeModule<WidgetBridgeModule>('WidgetBridge');
