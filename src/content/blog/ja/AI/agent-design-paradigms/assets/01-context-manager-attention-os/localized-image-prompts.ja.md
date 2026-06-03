# ローカライズ済み画像プロンプト

スタイル: 温かいオフホワイトの紙背景、抑制された技術ブログ用ダイアグラム、黒いインク線、淡い黄色のハイライト、読みやすい短いラベル。写真風、3D、密な文字は避ける。

- `photo-01-context.png`: Agent の次の行動に必要な情報環境として Context を示す。
- `photo-02-item-d14e53bd.png`: 単純な `messages[]` と、型づけされた事実、推測、ツール出力、Diff、権限、要約の違いを示す。
- `photo-03-context.png`: Context を、生の事実、State 投影、Memory、Policy、ContextBundle から作られるコンパイル成果物として示す。
- `photo-04-context-manager.png`: Policy、Evidence、Semantic、Compilation、Execution の各プレーンを示す。
- `photo-05-context-ontology.png`: Session、Event、Message、State、Artifact、Memory、Trace の安定した分類を示す。
- `photo-06-session.png`: Session を単なる会話履歴ではなく、作業上の識別子とライフサイクルとして示す。
- `photo-07-event.png`: replay と audit を支える追記専用 Event Log を示す。
- `photo-08-state.png`: event から投影される現在のタスク現場として State を示す。
- `photo-09-artifact.png`: 完全な証拠を Artifact に保存し、短い参照だけを context に渡す流れを示す。
- `photo-10-trace.png`: Trace を証拠、判断、行動、検証、失敗点、次の一手の監査可能な記録として示す。
- `photo-11-context-builder.png`: Context Builder をモデル入力の本当のコンパイラとして示す。
- `photo-12-compaction.png`: 出典とチェックを持つ意味の蒸留として Compaction を示す。
- `photo-13-cot.png`: 隠れた Chain-of-Thought ではなく公開証拠チェーンを保存する設計を示す。
- `photo-14-branch-memory-retrieval-subagent-context.png`: Branch、Retrieval、Memory、Subagent が Context Manager に戻る構造を示す。
- `photo-15-mvp.png`: Event store、State projector、Artifact store、Context builder、Compaction、Replay の MVP 順序を示す。
- `photo-16-item-f911edb4.png`: replay 可能な context runtime の重要な不変条件を示す。
- `photo-17-item-cc93ad2b.png`: Context policy、model input、tool evidence、memory、agent runtime を Context Manager が接続する関係を示す。
