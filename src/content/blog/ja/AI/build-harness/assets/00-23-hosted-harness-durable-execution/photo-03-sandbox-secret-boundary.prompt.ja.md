1. 図解タイプ

Decision path。この図は、秘密鍵が model、sandbox、logs、observation に入るかどうかの境界判断を示し、secret は制御されたツールを通じて一時的にだけ使われることを強調するため。

2. 画面要素リスト

左側は Model、右側は Sandbox、中央は Harness と Tool Runtime。上部に Vault を置き、ロックと金庫アイコンで淡い黄色に強調。フローノードは Model Intent、Harness Policy、Vault、Tool Runtime、Sandbox、Logs、Observation。赤いバツまたは禁止記号で Vault が Model と Sandbox へ直接入らないことを示す。淡い黄色で Tool Runtime を強調し、secret の制御された利用を表す。背景には軽いエンジニアリングスケッチ線。下部にフレーズ用スペース：「秘密鍵は能力であって、context ではない」。

3. 正向き画像プロンプト

記事内の技術解説図を描く。テーマは Hosted Harness の secret boundary が秘密鍵をモデル context と sandbox ログへ入れないようにする仕組み。

画風：アイボリーの紙背景、黒い手描きサインペンの線画、線の太さは少し不均一、少量の淡い黄色ハイライト、editorial technical illustration、技術ブログ向け手描きフロー図、明快で抑制され、エンジニアリングスケッチ感がある。

構図：決定経路図。左側は Model で、吹き出しアイコンにより「意図を出す」ことを表す。中央は Harness Policy で、盾とチェックにより「検証」を表す。中央右寄りは Tool Runtime で、レンチと小さな鍵穴により「制御された利用」を表し、淡い黄色で強調。上部は Vault で、金庫とロックアイコンにより「秘密鍵の事実ソース」を表し、これも淡い黄色で強調。右側は Sandbox で、境界付きコンテナ箱により「最小注入」を表す。下部には Logs と Observation を順に置き、ログ紙と要約カードにより「脱感作された出力」と「秘密鍵なしの投影」を表す。

明確な矢印で示す：Model Intent が Harness Policy に入り、Policy が Tool Runtime に Vault への一時アクセスを許可し、Tool Runtime は最小能力だけを Sandbox に持ち込み、Sandbox 出力はまず脱感作 Logs に入り、その後 Observation を生成する。2 本の破線と禁止記号で示す：Vault は Model に入らない、Vault は Sandbox へ直接露出しない。ノードラベルは短く、下部に手書きの日本語フレーズ用スペースを残す：「秘密鍵は能力であって、context ではない」。全体は技術ブログ内の手描きメカニズム図の雰囲気で、製品 UI でもセキュリティポスターでもない。

4. ネガティブプロンプト

写真写実にしない、3D にしない、複雑な UI スクリーンショットにしない、大量のコードを入れない、密集した小文字を入れない、複雑な表にしない、サイバーパンクにしない、ネオン色にしない、暗い背景にしない、カラフルな漫画調にしない、複雑な影を入れない、装飾を増やしすぎない、主要ノードは 8 個を超えない、背景の回路線を主体より目立たせない、長い日本語文章を生成しない。
