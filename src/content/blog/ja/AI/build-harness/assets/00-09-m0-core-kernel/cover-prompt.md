# cover: M0 Core Kernel：実モデルをシステムへ接続し、乗っ取らせない

Asset target: docs/ja/assets/00-09-m0-core-kernel/cover.png

imagegen を使って技術ブログのカバー画像を生成する。

## Prompt

技術ブログのカバー画像を描く。テーマは「M0 Core Kernel が contracts、registry、event bus、conversation state、runtime facade によって実モデルを受け止め、provider にシステム境界を乗っ取らせない」。

画風：アイボリーの紙背景、黒い手描きサインペンの線画、線幅はわずかに不均一、少量の淡い黄色ハイライト、editorial technical illustration、技術ブログ向けの手描きカーネルアーキテクチャ図、明瞭で抑制され、エンジニアリングのラフスケッチ感がある。

構図：横長のブログカバー。中心に小さく安定した Core Kernel ブロックを置き、内部に Contracts、Registry、Events、State、Facade の 5 つの短いモジュールラベルを入れる。左側は Provider 入力、右側は Runtime 出力。Provider の複雑なイベントは adapter 層を通って Core に入り、直接突き抜けない。全体は最小カーネルの設計図のように見せる。

ハイライト：Core Kernel ブロックと Contracts モジュールを淡い黄色で強調する。

背景：ごく薄い回路線、ノード接続線、エンジニアリングスケッチ補助線。主体より目立たせない。

文字：短い英語ラベルのみを許可し、日本語の長いタイトルは生成しない。上部に記事タイトルを重ねられる清潔な余白を残す。

ネガティブプロンプト：写真写実、3D、複雑な UI スクリーンショット、大量のコード、密集した小さな文字、複雑な表、サイバーパンク、ネオン色、暗い背景、カラフルな漫画調、複雑な影、過剰な装飾、8 個を超える主ノード、背景の回路線が主体より目立つ表現、長い日本語文章の生成は避ける。
