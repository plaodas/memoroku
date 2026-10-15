import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { loadMinutesSettings, saveMinutesSettings } from '../storage/settings';

type Props = {
  onClose: () => void;
};

export default function Settings({ onClose }: Props) {
  const [baseUrl, setBaseUrl] = useState('');
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadMinutesSettings()
      .then((settings) => {
        setBaseUrl(settings.baseUrl);
        setToken(settings.token);
      })
      .catch(() => {
        setError('保存済みの設定を読めませんでした。');
      });
  }, []);

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
        placeholderTextColor="#A39E98"
        style={styles.input}
        value={baseUrl}
      />
      <Text style={styles.label}>サービストークン</Text>
      <TextInput
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={setToken}
        placeholder="minutes で発行したトークン"
        placeholderTextColor="#A39E98"
        secureTextEntry
        style={styles.input}
        value={token}
      />
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
    backgroundColor: '#F6F3EE',
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
    color: '#1A1A1A',
    fontSize: 32,
    fontWeight: '700',
  },
  close: {
    color: '#1A1A1A',
    fontSize: 16,
    fontWeight: '600',
  },
  label: {
    color: '#6B6560',
    fontSize: 13,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    color: '#1A1A1A',
    fontSize: 16,
    marginBottom: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  error: {
    color: '#9B2C2C',
    marginBottom: 12,
  },
  save: {
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 14,
    paddingVertical: 14,
  },
  saveLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
