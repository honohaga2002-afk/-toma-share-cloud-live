# TOMA SHARE

Vercel + Neon Postgres で動く共有アプリです。

## 必須環境変数
- DATABASE_URL

## 今回の修正
- iPhone/SafariでOfficeファイルをData URLのまま開かず、Blob URLに変換してダウンロード
- PDF/画像は新しいタブでプレビュー
- Googleスプレッドシート共同編集ボタンを追加
- Vercel自動デプロイ確認
- iPhoneのファイル選択とキャンセル時の後片付けを安定化
- ファイルサイズ表示と2.5MB上限の案内を追加
- 未入力の名前でログインできないように修正
- iPhoneのホーム画面追加・ファイル保存方法の案内を追加
- スマートフォンのタップ領域と表示崩れを改善
