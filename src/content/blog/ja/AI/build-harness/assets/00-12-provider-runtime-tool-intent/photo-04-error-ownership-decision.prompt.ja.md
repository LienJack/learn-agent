1. 図解タイプ
decision path。provider error、intent error、validation error、permission event、tool error を発生源別に分流し、それぞれ異なる処理経路へ入れる。

2. 画面要素リスト
中央に「エラー発生」の決定菱形。外側へ 5 経路：ProviderError、IntentError、ValidationError、PermissionEvent、ToolError。各経路に異なる小アイコンと処理結果。ProviderError と ToolError の分離を淡い黄色で強調する。

3. 正向き画像プロンプト
記事内の技術解説図を描く。テーマは「Provider Error は Tool Error ではなく、エラーは責任層ごとに分流する」。

画風：アイボリーの紙背景、黒い手描きサインペンの線画、線幅はわずかに不均一、少量の淡い黄色ハイライト、editorial technical illustration、技術ブログ向けの手描きフロー図、明瞭で抑制され、エンジニアリングのラフスケッチ感がある。

構図：中心に警告三角アイコン付きの決定菱形ノード、ラベル Error Source。中心から右側と下側へ 5 本の手描き矢印を出す：① ProviderError は切れたクラウドインターフェース、ラベル Provider、結果 Retry/Fallback、淡い黄色で強調。② IntentError は壊れた JSON カード、ラベル Intent Parse、結果 Re-emit Intent。③ ValidationError はチェックリストとバツ、ラベル Validate、結果 Reject Execution。④ PermissionEvent は盾と人の確認、ラベル Permission、結果 Ask/Deny。⑤ ToolError は煙を出すレンチ、ラベル Tool Failed、結果 Observation、淡い黄色で強調。ProviderError と ToolError の間に明確な分離線を描き、同じ失敗ではないことを示す。矢印の終点には小さな受領票を置き、それぞれ別イベントへ書き込まれることを表す。

背景にはごく薄い回路線、ノード接続線、エンジニアリングスケッチの補助線を入れるが、主題より目立たせない。

文字：ノードラベルは短い日本語または英語のみにする。下部には後から金句を追加できる空白の一行を残す。全体は技術ブログ中の手描きメカニズム図であり、製品 UI や正式なアーキテクチャ図ではない。要素は明瞭で、階層と矢印関係をはっきりさせる。

4. ネガティブプロンプト
写真写実、3D、複雑な UI スクリーンショット、大量のコード、密集した小さな文字、複雑な表、サイバーパンク、ネオン色、暗い背景、カラフルな漫画調、複雑な影、過剰な装飾、8 個を超える主ノード、背景の回路線が主体より目立つ表現、長い日本語文章の生成は避ける。
