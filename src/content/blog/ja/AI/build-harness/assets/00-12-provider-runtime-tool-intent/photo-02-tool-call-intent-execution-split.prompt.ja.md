1. 図解タイプ
layered architecture。Tool Call、Tool Intent、Tool Execution を三つの責任領域に置き、同じ「ツール呼び出し」を Harness では三つの対象へ分ける必要があることを示す。

2. 画面要素リスト
三層構造：Provider プロトコル層、Core 意味層、Tool Runtime 実行層。各層 2 ノード、合計 6 ノード。上層は Tool Call と Tool Delta、中層は ToolIntent と Event Log、下層は Validate/Permission と Execution/Observation。ToolIntent と Execution を淡い黄色で強調する。

3. 正向き画像プロンプト
記事内の技術解説図を描く。テーマは「Tool Call、Tool Intent、Tool Execution の三層責任分離」。

画風：アイボリーの紙背景、黒い手描きサインペンの線画、線幅はわずかに不均一、少量の淡い黄色ハイライト、editorial technical illustration、技術ブログ向けの手描きフロー図、明瞭で抑制され、エンジニアリングのラフスケッチ感がある。

構図：縦方向の三層アーキテクチャ図。最上層「Provider 層」には Tool Call のクラウドメッセージカードと Tool Delta の断片パズル。中間層「Core 層」には ToolIntent の疑問符付きツールカードを淡い黄色で強調し、Event Log の台帳を置く。最下層「Runtime 層」には Validate/Permission の盾とチェック、Execution/Observation のレンチと受領票を置き、Execution/Observation を淡い黄色で強調する。上層から中層 ToolIntent へ、ToolIntent から Event Log と Runtime 層へ矢印を描く。層の間に明確な境界線を置き、小さな鍵アイコンで責任分離を示す。

背景にはごく薄い回路線、ノード接続線、エンジニアリングスケッチの補助線を入れるが、主題より目立たせない。

文字：ノードラベルは短い日本語または英語のみにする。下部には後から金句を追加できる空白の一行を残す。全体は技術ブログ中の手描きメカニズム図であり、製品 UI や正式なアーキテクチャ図ではない。要素は明瞭で、階層と矢印関係をはっきりさせる。

4. ネガティブプロンプト
写真写実、3D、複雑な UI スクリーンショット、大量のコード、密集した小さな文字、複雑な表、サイバーパンク、ネオン色、暗い背景、カラフルな漫画調、複雑な影、過剰な装飾、8 個を超える主ノード、背景の回路線が主体より目立つ表現、長い日本語文章の生成は避ける。
