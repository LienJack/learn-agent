1. 図解タイプ

決定経路図。要点は、multi-provider 環境で CLI が profile と能力要件に基づいて provider を選び、異なる provider の出力を統一 ModelEvent に正規化し、詳細がユーザー体験へ漏れないようにすること。

2. 画面要素リスト

左側入力：Model Request。中央の決定ノード：Capability Need、Profile Preference、Provider Resolver。右側に 2 分岐：Provider A、Provider B fallback。分岐は統一 ModelEvent へ合流し、Core Runtime と Stable UX に入る。淡い黄色で Provider Resolver と ModelEvent を強調。アイコン比喩：リクエストカード、パズル能力ブロック、ルーティング分岐、2 つのクラウド、統一イベントカード、端末小ウィンドウ。

3. ポジティブ画像プロンプト

記事内の技術解説図を描く。テーマは multi-provider が resolver を通じて Agent CLI のユーザー体験を安定させる仕組み。

画風：アイボリーの紙背景、黒い手描きサインペンの線画、線の太さは少し不均一、少量の淡い黄色ハイライト、editorial technical illustration、技術ブログ向け手描きフロー図、明快で抑制され、エンジニアリングスケッチ感がある。

構図：左から右への決定経路図。左側は「Model Request」のリクエストカード。矢印は「Capability Need」のパズルブロックへ入り、次に「Profile Preference」の設定付箋へ進み、中央の分岐ノード「Provider Resolver」へ入る。Resolver の右側は上下 2 経路に分かれる：上は「Provider A」のクラウドインターフェース、下は「Provider B fallback」のクラウドインターフェースと回退矢印。2 経路は最終的に同じ「ModelEvent」イベントカードへ合流し、「Core Runtime」と「Stable UX」の端末ウィンドウへ入る。

ノード：① Model Request：内部モデル要求を表すリクエストカード。② Capability Need：streaming、tool-intent、large-context などの能力需要を表すパズルブロック。③ Profile Preference：profile のモデル嗜好を表す付箋とスライダー。④ Provider Resolver：主 provider または fallback を選ぶ分岐標識。⑤ Provider A / Provider B：異なる供給者を表す 2 つのクラウドインターフェース。⑥ ModelEvent：正規化出力を表す統一イベントカード。⑦ Stable UX：provider が変わっても変化しないユーザー体験を表す端末小ウィンドウ。

ハイライト：Provider Resolver と ModelEvent を淡い黄色で強調し、provider 差異は resolver/adapter 内に留めることを表す。

背景：ごく薄い回路線、ノード接続線、エンジニアリングスケッチ補助線を入れ、主題より目立たせない。

文字：ノードラベルは短くする。下部に手書きの日本語フレーズ用スペースを残してよい：「Provider は替えられても、制御セマンティクスは替えない」。日本語文字が不安定なら、後入れ用の空白領域だけを残す。

全体は技術ブログ内の手描きメカニズム図の雰囲気で、製品 UI でも正式なアーキテクチャ図でもない。要素は明快で、階層と矢印関係がはっきりしている。

4. ネガティブプロンプト

写真写実にしない、3D にしない、複雑な UI スクリーンショットにしない、大量のコードを入れない、密集した小文字を入れない、複雑な表にしない、サイバーパンクにしない、ネオン色にしない、暗い背景にしない、カラフルな漫画調にしない、複雑な影を入れない、装飾を増やしすぎない、主要ノードは 8 個を超えない、背景の回路線を主体より目立たせない、長い日本語文章を生成しない。
