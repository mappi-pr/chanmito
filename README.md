# みとちゃんトランプ 自動更新システム

## 概要
- Google スプレッドシートを編集すると、自動で HTML テーブルに反映し、GitHub リポジトリにプッシュ。
- Cloudflare Pages でホスティングして公開。
- スマホからスプレッドシートを更新するだけでサイトの表が更新される。

## 構成
- **Google スプレッドシート**
  - データソース。1行目はヘッダーとして除外。
  - B〜E 列に URL を入れると、✓リンク付きのセルとして出力。

- **Apps Script (Code.gs)**
  - スプレッドシートの内容を読み取り、HTML テーブルを生成。
  - `index.html`（実際のページ）を GitHub に Push。
  - Base64 UTF-8 エンコードで文字化けを防止。
  - 既存ファイルが無い場合は新規作成、ある場合は SHA を指定して更新。

- **GitHub リポジトリ**
  - `mappi-pr/chanmito`
  - `cmito.html` が push される。

- **Cloudflare Pages**
  - GitHub リポジトリと連携し、自動デプロイ。

## セットアップ手順

1. **GitHub 側準備**
   - リポジトリ作成 (`mappi-pr/chanmito`)。
   - Personal Access Token を発行（repo 権限）。

2. **Apps Script 側準備**
   - スプレッドシートと紐付けてスクリプトを作成。
   - `generateTableHTML` でシート内容を HTML 化。
   - `pushToGitHub` で GitHub API に PUT。
     - ファイルが無い場合は新規作成。
     - 既存ファイルは SHA を取得して更新。

3. **Cloudflare Pages 設定**
   - GitHub リポジトリを接続。
   - デフォルトで `index.html` が公開される。(cmito.htmlにリダイレクト)

4. **動作確認**
   - スプレッドシートを更新。
   - Apps Script トリガーを走らせて GitHub に反映。
   - Cloudflare Pages が自動デプロイして反映。

## 注意点
- 1行目（ヘッダー）は除外している。
- Base64 エンコードは `Utilities.newBlob(content, 'text/html').getBytes()` を使う。

# 料金シミュレータ（仮）

## 概要
- calc配下に料金シミュレータを格納。
- 入店～退店までの概算を鉛筆なめなめするツール。お金は大事だからね～
