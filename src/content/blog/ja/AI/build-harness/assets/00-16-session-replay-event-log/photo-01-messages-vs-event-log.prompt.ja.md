1. 図解タイプ
layered architecture。Event Log、State、Messages の三層は同じものではなく、messages は事実ソースから投影されたモデル入力であることを説明する。

2. 画面要素リスト
6 つの主ノード：Event Log、Artifact Store、State Reducer、Session State、Context Projection、Messages。Event Log と Context Projection を淡い黄色で強調する。アイコンはログ巻物、ファイル箱、漏斗、状態カード、投影ライト、チャットバブル。

3. 正向き画像プロンプト
記事内の技術解説図を描く。テーマは「Session Replay における Event Log、State、Messages の事実ソース関係」。

画風：アイボリーの紙背景、黒い手描きサインペンの線画、線幅はわずかに不均一、少量の淡い黄色ハイライト、editorial technical illustration、技術ブログ向けの手描きフロー図、明瞭で抑制され、エンジニアリングのラフスケッチ感がある。

構図：レイヤードアーキテクチャ図。左側下層に Event Log のログ巻物を描き、淡い黄色で強調する。横に Artifact Store のファイル箱をつなぎ、大きな証拠材料を表す。中央に State Reducer の漏斗を描き、イベントを Session State の状態カードへ折りたたむ。右側に Context Projection の投影ライトを描き、淡い黄色で強調し、Messages のチャットバブルへ投影する。Event Log -> State Reducer -> Session State -> Context Projection -> Messages の明確な矢印を置く。さらに Event Log から Audit、Trace、Replay の 3 小ラベルへ破線を伸ばし、同じ事実ソースが複数ビューを生成できることを示す。

背景にはごく薄い回路線、ノード接続線、エンジニアリングスケッチの補助線を入れるが、主題より目立たせない。

文字：ノードラベルは短い日本語または英語のみにする。下部には後から金句を追加できる空白の一行を残す。全体は技術ブログ中の手描きメカニズム図であり、製品 UI や正式なアーキテクチャ図ではない。要素は明瞭で、階層と矢印関係をはっきりさせる。

4. ネガティブプロンプト
写真写実、3D、複雑な UI スクリーンショット、大量のコード、密集した小さな文字、複雑な表、サイバーパンク、ネオン色、暗い背景、カラフルな漫画調、複雑な影、過剰な装飾、8 個を超える主ノード、背景の回路線が主体より目立つ表現、長い日本語文章の生成は避ける。
