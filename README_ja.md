# Claude Code on Databricks (ccbricks)

Databricks のクラスター init script と Databricks Asset Bundles を使って、Claude Code をワークスペースにデプロイ・配備するための最小構成のリポジトリです。

## ディレクトリ構成

- `src/`: クラスターの init script。`install-claude-code.sh` が Claude Code をインストールし、環境変数を設定します。
- `resources/`: Databricks リソース定義（クラスターなど）。
- `databricks.yml`: バンドル定義（アーティファクトの配置先や変数を定義）。

## 前提条件

- Databricks CLI v0.205+（Bundles 対応）
- Unity Catalog が有効化済み
- 書き込み可能な Volume（catalog/schema/volume）が存在
- Unity Catalog の Artifact allowlists が設定済み（Volumes への配備を許可）
- モデルサービングに `anthropic` というエンドポイントが存在（Claude 用プロキシ）
- クラスターから `DATABRICKS_HOST` と `DATABRICKS_TOKEN` を参照できること
  - 必要に応じてクラスターの「環境変数」や「Secrets」を利用

## 変数

`databricks.yml` では次の変数を使用します。

- `catalog`: 使用するカタログ名（例: `main`）
- `schema`: 使用するスキーマ名（例: `claude_code`）
- `volume`: 使用するボリューム名（例: `init_scripts`）

アーティファクトは `/Volumes/${catalog}/${schema}/${volume}` 配下に配置されます。

## クイックスタート

1) Artifact allowlists を設定  
Volumes をアーティファクトの出力先に使うため、Unity Catalog の Allowlist に追加します。

2) 変数をセット  
`databricks.yml` の `targets.prod.variables` を編集するか、CLI 実行時に上書きします。

3) デプロイ

```bash
databricks bundle deploy --profile <profile_name>
```

4) クラスター作成/起動  
`resources/cluster.yml` に定義されたシングルノードクラスター `claude-code` が作成されます。UI または CLI から起動してください。

5) 動作確認（ノートブック等で）

```bash
%sh
claude --version
claude --help
```

## init script の挙動

- `curl -fsSL https://claude.ai/install.sh | bash -s stable` で Claude Code をインストール
- `/usr/local/share/claude` に配置し、`/usr/local/bin/claude` へシンボリックリンクを作成
- `/etc/profile.d/databricks_claude_code.sh` に以下の環境変数を設定
  - `ANTHROPIC_MODEL=databricks-claude-sonnet-4-5`
  - `ANTHROPIC_BASE_URL=$DATABRICKS_HOST/serving-endpoints/anthropic`
  - `ANTHROPIC_AUTH_TOKEN=$DATABRICKS_TOKEN`

## よくあるハマりどころ

- Volumes への書き込みが失敗する  
  - Artifact allowlists の許可設定を確認
  - `catalog/schema/volume` が存在するか確認

- `claude` コマンドが見つからない  
  - クラスターの再起動後に `%sh which claude` を実行して PATH を確認
  - クラスターのイベントログで init script の完了を確認

- 認証エラーが出る  
  - クラスター実行環境で `DATABRICKS_HOST`/`DATABRICKS_TOKEN` が参照できるように設定

## クリーンアップ

- クラスターの削除
- 必要に応じて Volume 上のアーティファクトを削除

## ライセンス

Apache License 2.0。詳細は `LICENSE` を参照してください。
<https://www.apache.org/licenses/LICENSE-2.0>

