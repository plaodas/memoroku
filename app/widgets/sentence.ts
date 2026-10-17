export function firstSentence(transcript: string): string {
  const compact = transcript.replace(/\s+/g, ' ').trim();
  if (!compact) {
    return '';
  }
  const end = compact.search(/[。！？.!?]/);
  const sentence = end >= 0 ? compact.slice(0, end + 1) : compact;
  return sentence.length > 140 ? `${sentence.slice(0, 139)}…` : sentence;
}

export function widgetLine(transcript: string): string {
  const sentence = firstSentence(transcript);
  if (sentence.length <= 15) {
    return sentence;
  }
  return `${sentence.slice(0, 14)}…`;
}
