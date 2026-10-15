import { Text, VStack } from '@expo/ui/swift-ui';
import { font, foregroundStyle, padding, widgetURL } from '@expo/ui/swift-ui/modifiers';
import { createWidget } from 'expo-widgets';

type MemoWidgetProps = {
  text: string;
  memoId: string;
};

function MemoWidgetView(props: MemoWidgetProps) {
  'widget';
  const sentence = props.text.length > 0 ? props.text : 'メモはまだありません';
  const url = props.memoId.length > 0 ? `memoroku://memo/${props.memoId}` : 'memoroku://';
  return (
    <VStack modifiers={[padding({ all: 16 }), widgetURL(url)]}>
      <Text modifiers={[font({ weight: 'semibold', size: 16 }), foregroundStyle('#1A1A1A')]}>
        {sentence}
      </Text>
    </VStack>
  );
}

const MemoWidget = createWidget<MemoWidgetProps>('MemoWidget', MemoWidgetView);

export default MemoWidget;
