# YouTube Music Playlist Organizer (Prototype)

YouTube Music のプレイリストをブラウザ上で整理するためのフロントエンド試作です。

## できること

- 左側サイドバーにプレイリスト一覧を表示
- プレイリスト選択後、サイドバー直下に楽曲一覧を表示
- ドラッグ&ドロップによる楽曲並び替え
- 検索結果から選択中プレイリストへの楽曲追加
- 楽曲削除
- Google ログインのUI（モック）

## 実行方法

```bash
python3 -m http.server 8000
```

ブラウザで `http://localhost:8000` を開いてください。

## 実運用で必要な実装

- Google Identity Services による OAuth ログイン
- YouTube Data API v3 のプレイリスト取得/更新
- API利用時のエラーハンドリング・レート制御
- バックエンド経由のトークン保護
