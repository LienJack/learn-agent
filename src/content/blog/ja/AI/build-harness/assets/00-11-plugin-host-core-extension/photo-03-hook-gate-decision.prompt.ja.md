1. 図解タイプ
決定経路図。preToolUse hook が intent と execution の間に立ち、allow、ask、deny、amend の制御された判断を行うことを示す。

2. 画面要素リスト
左から右へ：Tool Intent、Hook Gate、Policy Check、4 つの決定分岐 allow/ask/deny/amend、Tool Runtime、Event Log。Hook Gate と Event Log を強調する。アイコンは申請書、ゲート、盾、分岐標識、レンチ、ログ紙。deny と ask 分岐は blocked observation へ戻る。

3. 正向き画像プロンプト
記事内の技術解説図を描く。テーマは「Hook Kernel は intent から execution への間にある制御された遮断点である」。

画風：アイボリーの紙背景、黒い手描きサインペンの線画、線幅はわずかに不均一、少量の淡い黄色ハイライト、editorial technical illustration、技術ブログ向けの手描き決定図、明瞭で抑制され、エンジニアリングのラフスケッチ感がある。

構図：決定経路図。左側に Tool Intent 申請書を描き、矢印で中央の淡い黄色ハイライトの Hook Gate ゲートへ入れる。ゲート後ろに Policy Check の盾と分岐標識をつなぐ。分岐標識から 4 本の短い経路を出す：allow は Tool Runtime のレンチへ、ask は Human Confirm の小さな対話枠へ、deny は Blocked Observation の停止標識へ、amend は Amended Intent の修正申請書へ。すべての分岐は最終的に右側の淡い黄色ハイライトの Event Log ログ紙へつなぎ、判断が必ず事実として残ることを示す。

画面内に Intent 領域と Execution 領域を分ける明確な境界線を描く。Tool Runtime は allow 分岐の後にだけ現れる。背景には薄い回路線と工程スケッチ補助線。ラベルは短く、下部に空白の金句スペースを残す。全体は技術ブログ内の手描きメカニズム図であり、製品 UI ではない。

4. ネガティブプロンプト
写真写実、3D、複雑な UI スクリーンショット、大量のコード、密集した小さな文字、複雑な表、サイバーパンク、ネオン色、暗い背景、カラフルな漫画調、複雑な影、過剰な装飾、8 個を超える主ノード、背景の回路線が主体より目立つ表現、長い日本語文章の生成は避ける。
