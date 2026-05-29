1. 図解タイプ
状態シーケンス図。一回のツール呼び出しが intent から observation へ進み、監査可能かつ replay 可能なイベントチェーンとして残ることを示す。

2. 画面要素リスト
6 つの時間順ノード：Intent Event、Validation Event、Permission Event、Invocation Started、Observation Event、Replay View。Observation Event と Replay View を淡い黄色で強調し、Event Log 台帳を下に置く。

3. 正向き画像プロンプト
記事内の技術解説図を描く。テーマは「Tool Runtime がツール実行を監査可能・replay 可能な事実チェーンとして記録する」。

画風：アイボリーの紙背景、黒い手描きサインペンの線画、線幅はわずかに不均一、少量の淡い黄色ハイライト、editorial technical illustration、技術ブログ向けの手描きフロー図、明瞭で抑制され、エンジニアリングのラフスケッチ感がある。

構図：少し曲がった左から右への時間線。6 枚の小紙片ノード：Intent Event、Validation Event、Permission Event、Invocation Started、Observation Event、Replay View。Observation Event と Replay View は淡い黄色で強調する。時間線の下に Event Log 台帳を置き、これらがすべて事実ソースへ書き込まれることを表す。左上に小さな Model ノードを置き Intent へ矢印を向ける。右側の Replay View は実ツールではなく古い Observation にだけ接続し、replay は副作用をやり直さないことを示す。

背景にはごく薄い回路線、ノード接続線、エンジニアリングスケッチの補助線を入れるが、主題より目立たせない。

文字：ノードラベルは短い日本語または英語のみにする。下部には後から金句を追加できる空白の一行を残す。全体は技術ブログ中の手描きメカニズム図であり、製品 UI や正式なアーキテクチャ図ではない。要素は明瞭で、階層と矢印関係をはっきりさせる。

4. ネガティブプロンプト
写真写実、3D、複雑な UI スクリーンショット、大量のコード、密集した小さな文字、複雑な表、サイバーパンク、ネオン色、暗い背景、カラフルな漫画調、複雑な影、過剰な装飾、8 個を超える主ノード、背景の回路線が主体より目立つ表現、長い日本語文章の生成は避ける。
