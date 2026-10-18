import { Circle, HStack, Link, Text, VStack } from '@expo/ui/swift-ui';
import { font, foregroundStyle, frame, lineLimit, padding } from '@expo/ui/swift-ui/modifiers';
import { createWidget } from 'expo-widgets';

type WidgetMemo = {
  text: string;
  memoId: string;
};

type MemoWidgetProps = {
  memos: WidgetMemo[];
};

const ink = '#1A1A1A';
const mark = '#0EA5A1';

function MemoWidgetView(props: MemoWidgetProps) {
  'widget';
  const memos = Array.isArray(props.memos) ? props.memos.filter((memo) => memo.text && memo.memoId) : [];
  if (memos.length === 0) {
    return (
      <VStack alignment="leading" modifiers={[padding({ all: 14 })]}>
        <Text modifiers={[font({ weight: 'regular', size: 15 }), foregroundStyle(ink), lineLimit(2)]}>
          メモはまだありません
        </Text>
      </VStack>
    );
  }
  return (
    <VStack alignment="leading" spacing={0} modifiers={[padding({ all: 14 })]}>
      {memos.map((memo, index) => (
        <Link key={memo.memoId} destination={`memoroku://memo/${memo.memoId}`}>
          <HStack alignment="center" spacing={8} modifiers={[padding({ vertical: 4 })]}>
            <Circle modifiers={[frame({ width: 6, height: 6 }), foregroundStyle(mark)]} />
            <Text
              modifiers={[
                font({ weight: index === 0 ? 'bold' : 'regular', size: 15 }),
                foregroundStyle(ink),
                lineLimit(1),
              ]}
            >
              {memo.text}
            </Text>
          </HStack>
        </Link>
      ))}
    </VStack>
  );
}

const MemoWidget = createWidget<MemoWidgetProps>('MemoWidget', MemoWidgetView);

export default MemoWidget;
