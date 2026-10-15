# Agent notes

プロダクトの約束は [docs/promises.md](docs/promises.md) です。計画とコードがそこから外れるときは、先にその文書を更新します。

## リポジトリ

このリポジトリはスマホアプリだけです。文字起こしは `../minutes` の API を使います。minutes のコードは変更しません。二つのリポジトリは統合しません。

話者分け、要約、Word 出力は呼びません。まだ無い軽量エンドポイントへの実装はしません。

## API

minutes への呼び出しは [app/api/minutes.ts](app/api/minutes.ts) に閉じます。画面、SQLite、ウィジェット、通知は `upload`、`waitUntilReady`、`fetchTranscript` だけを使います。

使う経路は次の三つです。

- `POST /api/transcribe-upload-bg`
- `GET /api/bg/status/{task_id}`。`stage` が `success` になるまで、アプリのプロセスが生きている間だけ繰り返す
- `GET /api/bg/transcript/{task_id}?format=txt` の本文だけを保存する

認証は `Authorization: Bearer` のサービストークンです。ベース URL とトークンは expo-secure-store に保存し、ホームの設定画面から入れます。ログイン画面は作りません。

軽量エンドポイントへ切り替えるときは、`app/api/minutes.ts` と `docs/promises.md` の API の一文を更新します。画面、SQLite、ウィジェット、通知はそのままにします。

## ネイティブ

編集する場所は [plugins/native](plugins/native) と [plugins/withMemorokuNative.js](plugins/withMemorokuNative.js) です。`ios/` と `android/` は `npx expo prebuild` が作り直します。

iOS ウィジェットは [app/widgets/MemoWidget.tsx](app/widgets/MemoWidget.tsx) です。`'widget'` 指定子と `@expo/ui/swift-ui` だけで書き、`updateSnapshot` に文と memo id を渡します。App Group は `expo-widgets` が持ちます。Swift のウィジェットはアプリターゲットに入れません。

Android ウィジェットは [plugins/native/android/widgets/MemoWidget.kt](plugins/native/android/widgets/MemoWidget.kt) です。表示文は SharedPreferences の `memoroku_widget` に書き、Glance が読みます。書き込みと更新は [native-modules/widget](native-modules/widget) の `WidgetBridge` です。

## ウィジェットと通知

ウィジェットは、文字起こしが終わった短い文を表示します。録音ボタンは置きません。ウィジェットから minutes を呼びません。

タップと完了通知は `memoroku://memo/{id}` でそのメモを開きます。通知は `expo-notifications` のローカル通知です。

24時間を過ぎたメモを消したとき、表示中のメモが無ければウィジェットの文も空にします。
