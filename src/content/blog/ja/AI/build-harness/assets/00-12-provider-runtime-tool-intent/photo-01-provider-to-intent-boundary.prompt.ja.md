1. 図解タイプ
horizontal pipeline。ユーザー目標が Core、Provider Runtime、ModelEvent、ToolIntent、Tool Pipeline を通る責任境界を説明し、provider は翻訳だけを行い実行できないことを強調する。

2. 画面要素リスト
6 つの主ノード：ユーザー目標、Core Runtime、Provider Runtime、ModelEvent、ToolIntent、Tool Pipeline。Provider Runtime と Tool Pipeline の間には赤いバツで遮断された破線を描き、直接実行できないことを表す。ToolIntent と Tool Pipeline を淡い黄色で強調する。

3. 正向き画像プロンプト
記事内の技術解説図を描く。テーマは「Provider Runtime はモデル出力を ToolIntent に翻訳するだけで、ツールを直接実行しない」。

画風：アイボリーの紙背景、黒い手描きサインペンの線画、線幅はわずかに不均一、少量の淡い黄色ハイライト、editorial technical illustration、技術ブログ向けの手描きフロー図、明瞭で抑制され、エンジニアリングのラフスケッチ感がある。

構図：横方向パイプライン。左から右に 6 ノードを手描き矢印でつなぐ：① ユーザー目標は小端末、ラベル「テスト修正」。② Core Runtime はコンソールダッシュボード、ラベル Core。③ Provider Runtime はクラウドインターフェースとプラグ、ラベル Provider。④ ModelEvent は流れる token 点と文書、ラベル Event。⑤ ToolIntent は疑問符付きツールカード、ラベル Intent。⑥ Tool Pipeline はレンチ、盾、キューの組み合わせ、ラベル Execute Pipeline。Provider Runtime と Tool Pipeline の間に細い破線矢印を描き、控えめだが明確なバツで止める。主経路は Provider Runtime から ModelEvent / ToolIntent へ、Core に戻り、最後に Tool Pipeline へ入る。ToolIntent と Tool Pipeline を淡い黄色で強調する。

背景にはごく薄い回路線、ノード接続線、エンジニアリングスケッチの補助線を入れるが、主題より目立たせない。

文字：ノードラベルは短い日本語または英語のみにする。下部には後から金句を追加できる空白の一行を残す。全体は技術ブログ中の手描きメカニズム図であり、製品 UI や正式なアーキテクチャ図ではない。要素は明瞭で、階層と矢印関係をはっきりさせる。

4. ネガティブプロンプト
写真写実、3D、複雑な UI スクリーンショット、大量のコード、密集した小さな文字、複雑な表、サイバーパンク、ネオン色、暗い背景、カラフルな漫画調、複雑な影、過剰な装飾、8 個を超える主ノード、背景の回路線が主体より目立つ表現、長い日本語文章の生成は避ける。
