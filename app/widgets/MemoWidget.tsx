import { Link, Text, VStack } from '@expo/ui/swift-ui';
import { font, foregroundStyle, lineLimit, padding } from '@expo/ui/swift-ui/modifiers';
import { createWidget } from 'expo-widgets';

type WidgetMemo = {
  text: string;
  memoId: string;
};

type MemoWidgetProps = {
  memos: WidgetMemo[];
};

const textStyle = [
  font({ weight: 'semibold', size: 16 }),
  foregroundStyle('#1A1A1A'),
  lineLimit(1),
];

function MemoWidgetView(props: MemoWidgetProps) {
  'widget';
  const memos = Array.isArray(props.memos) ? props.memos.filter((memo) => memo.text && memo.memoId) : [];
  if (memos.length === 0) {
    return (
      <VStack alignment="leading" modifiers={[padding({ all: 16 })]}>
        <Text modifiers={textStyle}>メモはまだありません</Text>
      </VStack>
    );
  }
  return (
    <VStack alignment="leading" spacing={8} modifiers={[padding({ all: 16 })]}>
      {memos.map((memo) => (
        <Link
          key={memo.memoId}
          destination={`memoroku://memo/${memo.memoId}`}
          modifiers={textStyle}
        >
          <Text>{memo.text}</Text>
        </Link>
      ))}
    </VStack>
  );
}

const MemoWidget = createWidget<MemoWidgetProps>('MemoWidget', MemoWidgetView);

export default MemoWidget;
