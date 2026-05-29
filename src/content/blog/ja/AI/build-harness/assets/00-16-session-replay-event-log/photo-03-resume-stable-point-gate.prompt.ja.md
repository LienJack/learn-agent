1. 図解タイプ
state sequence。長時間タスクの復帰時に intent、permission、execution、observation から stable point へ至る状態列と、保守的な検査が必要な位置を示す。

2. 画面要素リスト
6 つの主ノード：Intent、Permission、Tool Running、Tool Finished、Observation、Stable Point。補助ノードとして Resume Gate と User Confirm。Stable Point と Resume Gate を淡い黄色で強調する。

3. ポジティブ画像プロンプト
記事内の技術解説図を描く。テーマは「Agent の長時間タスク復帰前には最後の安定点を見つけなければならない」。

画風：アイボリーの紙背景、黒い手描きサインペンの線画、線幅はわずかに不均一、少量の淡い黄色ハイライト、editorial technical illustration、技術ブログ向けの手描きフロー図、明瞭で抑制され、エンジニアリングのラフスケッチ感がある。

構図：状態シーケンス図。左から右へ 6 枚の状態カードを並べる：Intent 行動カード、Permission 盾、Tool Running 歯車、Tool Finished 端末チェック、Observation 目、Stable Point 小旗。Stable Point を淡い黄色で強調する。Tool Running の下に破線の警告分岐を描き、Resume Gate ゲートへ接続する。Resume Gate は淡い黄色で強調し、User Confirm ユーザー確認ノードへつなげる。半実行状態で止まった場合は保守的な検査と人の確認が必要であることを表す。主線の最後は Stable Point から Next Model Turn の小矢印へ進む。

背景にはごく薄い回路線、ノード接続線、エンジニアリングスケッチの補助線を入れるが、主題より目立たせない。

文字：ノードラベルは短い日本語または英語のみにする。下部には後から金句を追加できる空白の一行を残す。全体は技術ブログ中の手描きメカニズム図であり、製品 UI や正式なアーキテクチャ図ではない。要素は明瞭で、階層と矢印関係をはっきりさせる。

4. ネガティブプロンプト
写真写実、3D、複雑な UI スクリーンショット、大量のコード、密集した小さな文字、複雑な表、サイバーパンク、ネオン色、暗い背景、カラフルな漫画調、複雑な影、過剰な装飾、8 個を超える主ノード、背景の回路線が主体より目立つ表現、長い日本語文章の生成は避ける。
