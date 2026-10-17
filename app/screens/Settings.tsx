import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { loadMinutesSettings, saveMinutesSettings } from '../storage/settings';
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
  const [revealed, setRevealed] = useState(false);
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadMinutesSettings()
      .then((settings) => {
        setBaseUrl(settings.baseUrl);
        setToken(settings.token);
        setPreview(settings.token.length > 0);
        setRevealed(false);
      })
      .catch(() => {
        setError('保存済みの設定を読めませんでした。');
      });
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

  async function onSave() {
    setSaving(true);
    setError(null);
    try {
      await saveMinutesSettings({ baseUrl, token });
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '設定を保存できませんでした。');
      setSaving(false);
    }
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>接続</Text>
        <Pressable accessibilityRole="button" onPress={onClose}>
          <Text style={styles.close}>閉じる</Text>
        </Pressable>
      </View>
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
        disabled={saving}
        onPress={() => {
          onSave().catch(() => undefined);
        }}
        style={styles.save}
      >
        <Text style={styles.saveLabel}>{saving ? '保存中…' : '保存'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 64,
    paddingHorizontal: 20,
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
  saveLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
