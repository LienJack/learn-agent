# cover: Intent / Execution 分離：モデルが提案し、システムが実行する

Asset target: docs/ja/assets/00-10-intent-execution-separation/cover.png

imagegen を使って技術ブログのカバー画像を生成する。

## Prompt

技術ブログのカバー画像を描く。テーマは「モデルは構造化 Intent だけを提出し、システムは Validation、Permission、Execution、Observation を通って初めて外部世界を変更できる」。

画風：アイボリーの紙背景、黒い手描きサインペンの線画、線幅はわずかに不均一、少量の淡い黄色ハイライト、editorial technical illustration、技術ブログ向けの手描きパイプライン図、明瞭で抑制され、エンジニアリングのラフスケッチ感がある。

構図：横長のブログカバー。画面は左から右への制御された実行パイプライン：Model Proposal -> Intent -> Validate -> Permission -> Execute -> Observation。Intent と Execute の間には明確なゲートとチェックポイントを置く。Execute は小さなファイルシステムと端末アイコンに接続し、Observation は Model Proposal へ戻る。全体で「提案は認可ではなく、実行は制御されなければならない」ことを強調する。

ハイライト：Intent/Execution 間の Permission ゲートと、Observation の戻り矢印を淡い黄色で強調する。

背景：ごく薄い回路線、ノード接続線、エンジニアリングスケッチ補助線。主体より目立たせない。

文字：短い英語ラベルのみを許可し、日本語の長いタイトルは生成しない。右上に記事タイトルを重ねられる清潔な余白を残す。

ネガティブプロンプト：写真写実、3D、複雑な UI スクリーンショット、大量のコード、密集した小さな文字、複雑な表、サイバーパンク、ネオン色、暗い背景、カラフルな漫画調、複雑な影、過剰な装飾、8 個を超える主ノード、背景の回路線が主体より目立つ表現、長い日本語文章の生成は避ける。
