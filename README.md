# YouTube Music Playlist Organizer (Prototype)

YouTube Music のプレイリストをブラウザ上で整理するためのフロントエンド試作です。

## できること

- 左側サイドバーにプレイリスト一覧を表示
- プレイリスト選択後、サイドバー直下に楽曲一覧を表示
- ドラッグ&ドロップによる楽曲並び替え
- 検索結果から選択中プレイリストへの楽曲追加
- 楽曲削除
- Google OAuth でログインし、YouTube API からプレイリスト一覧を取得（プロトタイプ実装）

## 実行方法

```bash
python3 -m http.server 8000
```

ブラウザで `http://localhost:8000` を開いてください。

## ログイン + プレイリスト取得の手順

1. Google Cloud Console で OAuth Client ID（Web）を作成
2. `Authorized JavaScript origins` に `http://localhost:8000` を追加
3. アプリ画面の `Google OAuth Client ID` に Client ID を入力して保存
4. `Googleでログイン` を押して同意
5. `プレイリスト取得` で `mine=true` のプレイリスト一覧を取得

> 注意: YouTube API をフロントから直接呼ぶ構成のため、トークン保管とXSS対策は本実装で要強化。

## 本実装に向けた要件整理

- `docs/production-implementation-plan.md` を参照してください。

## 技術選定

- `docs/technology-selection.md` を参照してください。
