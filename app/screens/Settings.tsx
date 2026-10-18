import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { downloadWhisperModel, whisperModelReady } from '../transcription/localWhisper';
import {
  loadMinutesSettings,
  saveMinutesSettings,
  type TranscriptionMode,
} from '../storage/settings';
import { colors } from '../theme';

type Props = {
  onClose: () => void;
};

function maskedToken(value: string): string {
  if (value.length <= 4) {
    return '•'.repeat(value.length);
  }
  return `••••${value.slice(-4)}`;
}

export default function Settings({ onClose }: Props) {
  const [baseUrl, setBaseUrl] = useState('');
  const [token, setToken] = useState('');
  const [mode, setMode] = useState<TranscriptionMode>('minutes');
  const [modelReady, setModelReady] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const downloadAbort = useRef<AbortController | null>(null);

  useEffect(() => {
    loadMinutesSettings()
      .then((settings) => {
        setBaseUrl(settings.baseUrl);
        setToken(settings.token);
        setMode(settings.mode);
        setModelReady(whisperModelReady());
        setPreview(settings.token.length > 0);
        setRevealed(false);
      })
      .catch(() => {
        setError('保存済みの設定を読めませんでした。');
      });
    return () => {
      downloadAbort.current?.abort();
    };
  }, []);

  function onChangeToken(next: string) {
    setToken(next);
    if (next.length === 0) {
      setRevealed(false);
      setPreview(false);
    }
  }

  function onToggleToken() {
    if (revealed) {
      setRevealed(false);
      setPreview(token.length > 0);
      return;
    }
    setRevealed(true);
    setPreview(false);
  }

  async function onSelectDevice() {
    setError(null);
    setMode('device');
    if (whisperModelReady()) {
      setModelReady(true);
      return;
    }
    const controller = new AbortController();
    downloadAbort.current?.abort();
    downloadAbort.current = controller;
    setDownloading(true);
    setProgress(null);
    try {
      await downloadWhisperModel((ratio) => {
        setProgress(ratio);
      }, controller.signal);
      setModelReady(true);
    } catch (cause) {
      if (controller.signal.aborted) {
        return;
      }
      setMode('minutes');
      setModelReady(false);
      setError(cause instanceof Error ? cause.message : 'モデルを取得できませんでした。');
    } finally {
      setDownloading(false);
      if (downloadAbort.current === controller) {
        downloadAbort.current = null;
      }
    }
  }

  function onSelectMinutes() {
    downloadAbort.current?.abort();
    setMode('minutes');
    setDownloading(false);
  }

  async function onSave() {
    setSaving(true);
    setError(null);
    if (mode === 'device' && !whisperModelReady()) {
      setError('モデルの取得が終わってから保存してください。');
      setSaving(false);
      return;
    }
    try {
      await saveMinutesSettings({ baseUrl, token, mode });
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '設定を保存できませんでした。');
      setSaving(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.screen} style={styles.scroll}>
      <View style={styles.header}>
        <Text style={styles.title}>接続</Text>
        <Pressable accessibilityRole="button" onPress={onClose}>
          <Text style={styles.close}>閉じる</Text>
        </Pressable>
      </View>
      <Text style={styles.label}>文字起こし</Text>
      <View style={styles.modes}>
        <Pressable
          accessibilityRole="button"
          onPress={onSelectMinutes}
          style={[styles.mode, mode === 'minutes' ? styles.modeSelected : null]}
        >
          <Text style={[styles.modeLabel, mode === 'minutes' ? styles.modeLabelSelected : null]}>
            minutes
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={downloading}
          onPress={() => {
            onSelectDevice().catch(() => undefined);
          }}
          style={[styles.mode, mode === 'device' ? styles.modeSelected : null]}
        >
          <Text style={[styles.modeLabel, mode === 'device' ? styles.modeLabelSelected : null]}>
            端末内
          </Text>
        </Pressable>
      </View>
      {downloading ? (
        <View style={styles.progressBlock}>
          <Text style={styles.progressLabel}>
            {progress == null
              ? 'モデルを取得しています…'
              : `モデルを取得しています… ${Math.round(progress * 100)}%`}
          </Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.round((progress ?? 0) * 100)}%` }]} />
          </View>
        </View>
      ) : mode === 'device' && modelReady ? (
        <Text style={styles.modelReady}>多言語 Base を端末に保存しました。</Text>
      ) : null}
      <Text style={styles.label}>サーバー URL</Text>
      <TextInput
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        onChangeText={setBaseUrl}
        placeholder="http://192.168.0.1:8080"
        placeholderTextColor={colors.muted}
        style={styles.input}
        value={baseUrl}
      />
      <Text style={styles.label}>サービストークン</Text>
      <View style={styles.tokenField}>
        {preview && token.length > 0 ? (
          <Text numberOfLines={1} style={styles.tokenValue}>
            {maskedToken(token)}
          </Text>
        ) : (
          <TextInput
            autoCapitalize="none"
            autoComplete="off"
            autoCorrect={false}
            importantForAutofill="no"
            onChangeText={onChangeToken}
            placeholder="minutes で発行したトークン"
            placeholderTextColor={colors.muted}
            secureTextEntry={!revealed}
            style={[styles.tokenInput, token.length > 0 ? styles.tokenInputWithAction : null]}
            textContentType="none"
            value={token}
          />
        )}
        {token.length > 0 ? (
          <Pressable
            accessibilityLabel={revealed ? 'サービストークンを隠す' : 'サービストークンを表示'}
            accessibilityRole="button"
            onPress={onToggleToken}
          >
            <Text style={styles.reveal}>{revealed ? '隠す' : '表示'}</Text>
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: saving || downloading }}
        disabled={saving || downloading}
        onPress={() => {
          onSave().catch(() => undefined);
        }}
        style={[styles.save, saving || downloading ? styles.saveDisabled : null]}
      >
        <Text style={styles.saveLabel}>{saving ? '保存中…' : '保存'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screen: {
    flexGrow: 1,
    backgroundColor: colors.background,
    paddingTop: 64,
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  title: {
    color: colors.text,
    fontSize: 32,
    fontWeight: '700',
  },
  close: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '600',
  },
  label: {
    color: colors.muted,
    fontSize: 13,
    marginBottom: 8,
  },
  modes: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  mode: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: 12,
  },
  modeSelected: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  modeLabel: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  modeLabelSelected: {
    color: colors.accent,
  },
  progressBlock: {
    marginBottom: 20,
  },
  progressLabel: {
    color: colors.muted,
    fontSize: 13,
    marginBottom: 8,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.line,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    backgroundColor: colors.accent,
  },
  modelReady: {
    color: colors.muted,
    fontSize: 13,
    marginBottom: 20,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    color: colors.text,
    fontSize: 16,
    marginBottom: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  tokenField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 20,
    paddingLeft: 14,
  },
  tokenInput: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    paddingVertical: 12,
    paddingRight: 14,
  },
  tokenInputWithAction: {
    paddingRight: 0,
  },
  tokenValue: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    paddingVertical: 12,
    paddingRight: 8,
  },
  reveal: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '600',
    paddingVertical: 12,
    paddingRight: 14,
    paddingLeft: 8,
  },
  error: {
    color: colors.danger,
    marginBottom: 12,
  },
  save: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 14,
  },
  saveDisabled: {
    opacity: 0.4,
  },
  saveLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
