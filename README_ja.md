# Claude Code on Databricks (ccbricks)

[English](README.md) | 日本語

Databricks のクラスター init script と Databricks Asset Bundles を使って、Claude Code をワークスペースにデプロイ・配備するための最小構成のリポジトリです。

## ディレクトリ構成

- `src/`: クラスターの init script。`install-claude-code.sh` が Claude Code をインストールし、環境変数を設定します。
- `resources/cluster.yml`: ターゲット（dev/prod）に応じて適応するクラスター設定
- `databricks.yml`: ターゲット固有の変数と init script 設定を含むバンドル定義

## 前提条件

### 共通（dev と prod 両方）
- Databricks CLI v0.205+（Bundles 対応）
- モデルサービングに `anthropic` というエンドポイントが存在（Claude 用プロキシ）
- クラスターから `DATABRICKS_HOST` と `DATABRICKS_TOKEN` を参照できること
  - 必要に応じてクラスターの「環境変数」や「Secrets」を利用

### Production ターゲットのみ
- Unity Catalog が有効化済み、書き込み可能な Volume が必要
  - Init script を Unity Catalog Volumes に保存するために必要

## 変数

`databricks.yml` では次の変数を使用します：

- `node_type_id`: クラスターで使用するノードタイプ（例: `m6i.2xlarge`）
- `data_security_mode`: データセキュリティモード（`SINGLE_USER` または `USER_ISOLATION`）
- `catalog`, `schema`, `volume`: Unity Catalog の座標（prod ターゲットのみ必要）

## クイックスタート

### Development 環境（デフォルト）

**Unity Catalog のセットアップ不要** - Workspace ファイルを init script に使用します。

1) デプロイ

```bash
databricks bundle deploy --profile <profile_name>
# または明示的に dev ターゲットを指定
databricks bundle deploy -t dev --profile <profile_name>
```

2) クラスター作成/起動
シングルノードクラスター `claude-code-server` が以下の設定で作成されます：
- `SINGLE_USER` データセキュリティモード
- Workspace ベースの init script（Unity Catalog Volumes 不要）
- デプロイ時に自動アップロード

UI または CLI からクラスターを起動してください。

3) 動作確認（ノートブック等で）

```bash
%sh
claude --version
claude --help
```

### Production 環境

**Unity Catalog Volumes が必要** - Init script は production 用に Volumes に保存されます。

1) Unity Catalog を設定
   - 書き込み可能な Volume（catalog/schema/volume）が存在することを確認
   - Unity Catalog の Artifact allowlists を設定して Volumes への書き込みを許可
   - デフォルトの Volume パス: `/Volumes/main/claude_code/init_scripts`

2) 変数をセット（オプション）
Volume の座標がデフォルト（`main`, `claude_code`, `init_scripts`）と異なる場合は、`databricks.yml` の `targets.prod.variables` を編集します。

3) デプロイ

```bash
databricks bundle deploy -t prod --profile <profile_name>
```

これにより：
- Init script が指定された Unity Catalog Volume にアップロードされます
- Volumes ベースの init script 参照を持つクラスター設定が作成されます

4) クラスター作成/起動
シングルノードクラスター `claude-code-server` が以下の設定で作成されます：
- `USER_ISOLATION` データセキュリティモード（マルチユーザーサポート）
- Volumes ベースの init script（Unity Catalog Volume に保存）
- 共有ワークスペースパス: `/Workspace/Shared/.bundle/ccbricks/prod`

UI または CLI からクラスターを起動してください。

## init script の挙動

- `curl -fsSL https://claude.ai/install.sh | bash -s stable` で Claude Code をインストール
- `/usr/local/share/claude` に配置し、`/usr/local/bin/claude` へシンボリックリンクを作成
- `/etc/profile.d/databricks_claude_code.sh` に以下の環境変数を設定：
  - `ANTHROPIC_MODEL=databricks-claude-sonnet-4-5`
  - `ANTHROPIC_BASE_URL=$DATABRICKS_HOST/serving-endpoints/anthropic`
  - `ANTHROPIC_AUTH_TOKEN=$DATABRICKS_TOKEN`

## クラスター設定

両ターゲットとも `claude-code-server` という名前のシングルノードクラスターを作成しますが、以下の違いがあります：

### Development ターゲット（`dev`）
- **データセキュリティモード**: `SINGLE_USER`（シンプルなセットアップ用）
- **Init script の場所**: Workspace ファイル（Unity Catalog 不要）
  - パス: `/Workspace/Users/<username>/.bundle/ccbricks/dev/files/src/install-claude-code.sh`
  - `databricks bundle deploy` 時に自動アップロード
- **ノードタイプ**: `m6i.xlarge`（デフォルト、上書き可能）
- **最適な用途**: 個人での開発とテスト

### Production ターゲット（`prod`）
- **データセキュリティモード**: `USER_ISOLATION`（マルチユーザーサポートと分離）
- **Init script の場所**: Unity Catalog Volumes（UC セットアップ必要）
  - パス: `/Volumes/main/claude_code/init_scripts/.internal/install-claude-code.sh`
  - `databricks bundle deploy -t prod` 時に Volume にアップロード
- **ノードタイプ**: `m6i.2xlarge`（デフォルト、上書き可能）
- **ワークスペースパス**: `/Workspace/Shared/.bundle/ccbricks/prod`（チーム間で共有）
- **最適な用途**: セキュアなマルチユーザーアクセスでのチームコラボレーション

## トラブルシューティング

### 共通の問題（dev と prod 両方）

- **`claude` コマンドが見つからない**
  - クラスターの再起動後に `%sh which claude` を実行して PATH を確認
  - クラスターのイベントログで init script の完了を確認
  - Init script が正しくアップロードされているか確認

- **認証エラーが出る**
  - クラスター実行環境で `DATABRICKS_HOST`/`DATABRICKS_TOKEN` が参照できるように設定
  - `anthropic` サービングエンドポイントが存在しアクセス可能か確認

### Production 固有の問題

- **Volumes への書き込みが失敗する**
  - Unity Catalog の Artifact allowlists が設定されているか確認
  - Volume パスが存在するか確認: `/Volumes/main/claude_code/init_scripts`
  - Volume への書き込み権限があるか確認
  - `databricks.yml` で指定された catalog、schema、volume が UC のセットアップと一致しているか確認

## クリーンアップ

- ワークスペースからクラスターを削除
- クラスター削除時に、ワークスペース内のバンドルアーティファクトは自動的に削除されます

## ライセンス

Apache License 2.0。詳細は `LICENSE` を参照してください。
<https://www.apache.org/licenses/LICENSE-2.0>
