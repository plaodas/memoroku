# Agent notes

プロダクトの約束は [docs/promises.md](docs/promises.md) です。計画とコードがそこから外れるときは、先にその文書を更新します。

## リポジトリ

このリポジトリはスマホアプリだけです。文字起こしは `../minutes` の API を使います。minutes のコードは変更しません。二つのリポジトリは統合しません。

話者分け、要約、Word 出力は呼びません。アップロードには `transcript_only=1` を付け、整形を待ちません。

## API

minutes への呼び出しは [app/api/minutes.ts](app/api/minutes.ts) に閉じます。画面、SQLite、ウィジェット、通知は `upload`、`waitUntilReady`、`fetchTranscript` だけを使います。

使う経路は次の三つです。

- `POST /api/transcribe-upload-bg`。multipart に `transcript_only=1` を付ける
- `GET /api/bg/status/{task_id}`。`stage` が `success` になるまで、アプリのプロセスが生きている間だけ繰り返す
- `GET /api/bg/transcript/{task_id}?format=txt` の本文だけを保存する

認証は `Authorization: Bearer` のサービストークンです。ベース URL とトークンは expo-secure-store に保存し、ホームの設定画面から入れます。ログイン画面は作りません。

軽量エンドポイントへ切り替えるときは、`app/api/minutes.ts` と `docs/promises.md` の API の一文を更新します。画面、SQLite、ウィジェット、通知はそのままにします。

## ネイティブ

編集する場所は [plugins/native](plugins/native) と [plugins/withMemorokuNative.js](plugins/withMemorokuNative.js) です。`ios/` と `android/` は `npx expo prebuild` が作り直します。

iOS ウィジェットは [app/widgets/MemoWidget.tsx](app/widgets/MemoWidget.tsx) です。`'widget'` 指定子と `@expo/ui/swift-ui` だけで書き、`updateSnapshot` に最大3件の文と memo id を渡します。App Group は `expo-widgets` が持ちます。Swift のウィジェットはアプリターゲットに入れません。

Android ウィジェットは [plugins/native/android/widgets/MemoWidget.kt](plugins/native/android/widgets/MemoWidget.kt) です。表示文は SharedPreferences の `memoroku_widget` に書き、Glance が読みます。書き込みと更新は [native-modules/widget](native-modules/widget) の `WidgetBridge` です。

## ウィジェットと通知

ウィジェットは、文字起こしが終わった新しい録音を最大3件、各先頭15文字で表示します。録音ボタンは置きません。ウィジェットから minutes を呼びません。

ウィジェットの行と完了通知は `memoroku://memo/{id}` でそのメモを開きます。通知は `expo-notifications` のローカル通知です。

24時間を過ぎたメモを消したとき、表示するメモが無ければウィジェットも空にします。

## Windows へ移したあとの作業

作業コピーは GitHub から Windows のディスクへ clone したものです。WSL の `/home/agake/memoroku` と `\\wsl$\` では続けません。

`node_modules` は Windows 側で入れます。`react` は `19.2.3` に固定してあり、`@expo/ui` が任意 peer で引く `react-dom@19.3.1` は `react@^19.3.1` を要求します。この衝突があるので `npm install` は使わず、ロックファイルどおりに次で入れます。

```powershell
npm ci --legacy-peer-deps
```

Android の確認は Windows の Android Studio で行います。ターミナルから Gradle と SDK が見えるように、ユーザー環境変数を次にします。設定したあとはターミナルを開き直します。

- `JAVA_HOME` は Android Studio 付属の JDK（`C:\Program Files\Android\Android Studio\jbr`）
- `JAVA_TOOL_OPTIONS` は `--enable-native-access=ALL-UNNAMED`。この JDK 25 では、付けないと prefab が `java.lang.System` の制限で `:expo-modules-core:configureCMakeDebug` に失敗する
- `ANDROID_HOME` は SDK（`%LOCALAPPDATA%\Android\Sdk`）
- PATH に `%JAVA_HOME%\bin`、`%ANDROID_HOME%\platform-tools`、`%ANDROID_HOME%\emulator`

`npx expo run:android` で development build を作り、API 31 以降のエミュレータか実機に載せます。ウィジェットとネイティブ録音があるため、Expo Go では動きません。

minutes を WSL で動かすとき、エミュレータから見たホストは `10.0.2.2` です。設定画面のサーバー URL は、そのアドレスと minutes の公開ポートにします。

iOS はソースの実装だけ進めます。Windows では `expo run:ios` と `pod install` は実行しません。ウィジェット、録音、通知の実機確認は、Mac と iPhone が揃ってから行います。

改行コードは LF のままにします。Windows の `core.autocrlf` で `gradlew` を CRLF に変換しません。
