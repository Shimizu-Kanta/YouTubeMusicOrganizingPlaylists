# 技術選定（YouTube Music Playlist Organizer）

`docs/production-implementation-plan.md` を前提として、本実装に進むための技術選定をまとめます。

## 1. 結論（まずこれで進める）

- フロントエンド: **React + TypeScript + Vite**
- UI: **Tailwind CSS + shadcn/ui**
- 状態管理/データ取得: **TanStack Query + Zustand**
- DnD: **dnd-kit**
- バックエンド(BFF): **Node.js + TypeScript + Fastify**
- 認証: **Google Identity Services (OAuth 2.0) + BFFでトークン管理**
- 永続化DB: **PostgreSQL + Prisma**
- キャッシュ/キュー: **Redis（必要時）**
- 監視: **Sentry + OpenTelemetry + 構造化ログ(JSON)**
- デプロイ:
  - Frontend: **Vercel / Cloud Run static hosting**
  - Backend: **Cloud Run**
  - DB: **Cloud SQL (PostgreSQL)**

## 2. この構成を採用する理由

### 2.1 フロントエンド

- React + TypeScript
  - チーム開発時の型安全性が高く、機能追加時の破壊を減らせる
- Vite
  - 初期開発速度が速く、ローカル体験が軽い
- TanStack Query
  - API取得・再取得・エラー処理・楽観更新が実装しやすい
- dnd-kit
  - 並び替えUIで実績があり、キーボード操作にも拡張しやすい

### 2.2 バックエンド(BFF)

- Fastify
  - Node系で高速、型連携しやすい
- BFF方式
  - OAuthトークンをクライアントで長期保持せずに済む
  - YouTube API呼び出し制御（リトライ/クォータ管理）を集中化できる

### 2.3 データ層

- PostgreSQL + Prisma
  - 監査ログや下書き保存などの構造化データに向く
  - Prismaでマイグレーションと型生成を統一できる

## 3. 代替案と見送り理由

- Next.js フルスタック
  - 良い選択肢だが、まずはBFF分離構成の方が責務分離が明確
- NestJS
  - 大規模化には強いが、初期立ち上げはFastifyの方が軽量
- Firebase/Firestore中心
  - 迅速だが、監査・集計・将来の拡張でRDB優位

## 4. 最低限の実装アーキテクチャ

```text
Browser (React)
  -> BFF API (Fastify)
      -> Google OAuth / YouTube Data API v3
      -> PostgreSQL (user settings, draft changes, audit logs)
      -> Redis (optional: rate-limit/backoff queue)
```

## 5. コンポーネント構成（フロント）

- `PlaylistSidebar`
  - プレイリスト一覧表示
  - 選択状態管理
- `TrackListDnD`
  - 並び替え（dnd-kit）
  - 削除操作
- `SearchPanel`
  - 楽曲検索
  - 選択中プレイリストへの追加
- `SaveBar`
  - 即時保存 or 一括保存の状態表示
- `AuthGate`
  - ログイン状態による画面分岐

## 6. API設計（最初の契約）

- `GET /api/me`
- `GET /api/playlists`
- `GET /api/playlists/:playlistId/items`
- `POST /api/playlists/:playlistId/items`（追加）
- `DELETE /api/playlists/:playlistId/items/:playlistItemId`（削除）
- `PATCH /api/playlists/:playlistId/items/reorder`（並び替え）

> 実際のYouTube APIレスポンスはBFF内で吸収し、フロントには統一DTOで返す。

## 7. 認証・セキュリティの実装ルール

- OAuthフローはAuthorization Code + PKCEを基本
- アクセストークンはBFF側で暗号化保管（または短命セッション）
- リフレッシュトークン取り扱いポリシーを事前合意
- フロントはHttpOnly Cookieベースのセッション利用
- CSRF対策トークンを導入

## 8. 品質基準（Definition of Done）

- ログイン～取得～追加～削除～並び替え～保存までE2Eで通る
- API失敗時にユーザーが復旧可能（リトライ/UI通知）
- 主要ロジックに単体テストあり（並び替え、差分生成）
- 監視でエラー率とレイテンシが追える

## 9. 2スプリントの実装計画（例）

### Sprint 1（基盤）

- React + Vite + TS 雛形
- Fastify + Prisma 雛形
- OAuthログイン
- プレイリスト一覧/詳細取得
- 基本UI（サイドバー・検索・トラック一覧）

### Sprint 2（編集機能）

- 追加/削除/並び替えAPI連携
- 楽観更新 + 失敗ロールバック
- 監査ログ
- E2E整備
- 限定ユーザー公開

## 10. 今すぐ決めるべき事項（合意ポイント）

1. 保存方式: 即時反映 or 一括保存
2. 検索方式: YouTube検索APIを直接使うか
3. トークン保管方式: DB暗号化保管 or セッション短命化
4. 初期対応範囲: PC優先 / モバイル優先
5. 初期SLO: 例) API成功率99.5%以上

---

次ステップとして、この技術選定をもとに **実装タスクをIssue化できる粒度（1〜2日単位）** へ分解します。


## 11. 現在の意思決定（あなたの回答を反映）

- 保存形式: **一括保存**（確定）
- YouTube API: **フロントエンドから直接利用**（確定）
- 初期対応範囲: **PC優先**（確定）
- トークン保管方式: **未確定**
- 初期SLO: **未確定**

## 12. この条件で実装できるか

**結論: 実装できます。**

ただし、YouTube APIを直接使う場合は次の点を最初に決める必要があります。

1. OAuthトークンの保持場所
   - 短時間メモリ保持（推奨）
   - localStorage/sessionStorage（簡易だがXSSリスク増）
2. 一括保存時の失敗復旧
   - 変更差分をローカルで保持し、失敗時に再送できるようにする
3. クォータ対策
   - 並び替えを1件ずつ送らず、保存時に最小回数で更新する

## 13. 次に固定すべき未決定事項（最小）

### 13.1 トークン保管方式（提案）

- 初期版: **メモリ保持 + 再ログイン許容**
  - 理由: 実装が最も安全寄りで単純
- その後: 必要ならBFFを追加して安全性を引き上げる

### 13.2 初期SLO（提案）

- API成功率: **99.0% 以上**
- P95応答時間: **2.0秒以内**（主要操作）
- 重大障害復旧目標: **24時間以内**

## 14. 実装開始時の具体タスク（この条件用）

1. 一括保存用の`ChangeSet`設計（追加/削除/並び替え）
2. ローカル編集中状態の管理実装（保存前プレビュー）
3. OAuthログイン + YouTube API直接呼び出し実装
4. 保存API実行（成功時コミット、失敗時リトライ導線）
5. PC向けUI最適化（横幅1280基準）
6. E2E（ログイン→編集→一括保存）を最優先で自動化


## 15. 次の実装フェーズ（ログイン→プレイリスト取得）

- Google OAuth Client ID を作成し `localhost` origin を許可
- GIS Token Client で `youtube` scope のアクセストークン取得
- `GET https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&mine=true&maxResults=50` を実行
- 取得結果を `PlaylistSidebar` に反映
- 失敗時は HTTP ステータスと再ログイン導線を表示
