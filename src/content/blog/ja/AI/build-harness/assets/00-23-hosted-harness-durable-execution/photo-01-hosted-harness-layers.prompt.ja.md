1. 図解タイプ

Layered architecture。この図は、Hosted Harness がリモート CLI プロセスではなく、長時間タスクのライフサイクルを中心に階層された制御システムであることを読者に理解させるため。

2. 画面要素リスト

画面は上から下への階層構造を使い、6 個の主要ノードを含める：Automation、Harness、Session、Sandbox、Deployment、Notification。Automation は最上部でカレンダー時計のようにし、タスクのトリガーを表す。Harness は中央にコンソールパネルとして置き、淡い黄色で強調する。Session はイベント台帳アイコンで表し、これも淡い黄色で強調する。Sandbox は境界付きのコンテナ箱。Deployment はクラウドインフラとキューのアイコン。Notification はメッセージ吹き出し。矢印は Automation から Harness へ流れ、さらに Session、Sandbox、Notification に接続する。Deployment はすべての層を支える土台。背景にはごく薄い回路線とエンジニアリングスケッチ補助線。下部にフレーズ用スペース：「Hosted の核心はライフサイクルをホスト管理すること」。

3. ポジティブ画像プロンプト

記事内の技術解説図を描く。テーマは Hosted Harness の 5 層境界：Automation、Harness、Session、Sandbox、Deployment がどのように協調してリモート Agent の長時間タスクをホスト管理するか。

画風：アイボリーの紙背景、黒い手描きサインペンの線画、線の太さは少し不均一、少量の淡い黄色ハイライト、editorial technical illustration、技術ブログ向け手描きフロー図、明快で抑制され、エンジニアリングスケッチ感がある。

構図：階層アーキテクチャ図。画面を上から下へ 5 層に分ける。最上層は Automation で、カレンダーと小時計アイコンにより「定時トリガー」を表す。第 2 層は Harness で、コンソールパネルとつまみにより「制御ループ」を表し、淡い黄色で強調する。第 3 層は Session で、開いたイベント台帳により「事実ソース」を表し、これも淡い黄色で強調する。第 4 層は Sandbox で、境界線付きコンテナ箱により「制御された実行」を表す。最下層は Deployment で、クラウド、キュー、worker、vault、artifact store の簡略アイコンにより「インフラ支援」を表す。右側に Notification のメッセージ吹き出しを置き、Harness と Session に接続し、通知もライフサイクルイベントであることを表す。

ノードラベルは短く：Automation、Harness、Session、Sandbox、Deployment、Notify。矢印は、Automation がタスクを作成し、Harness がループを進め、Session が事実を記録し、Sandbox が動作を実行し、Deployment がキュー、worker、vault、artifact を提供することを明確に示す。下部に手書きの日本語フレーズ用スペースを残す：「Hosted の核心はライフサイクルをホスト管理すること」。全体は技術ブログ内の手描きメカニズム図の雰囲気で、製品 UI でも正式なクラウドアーキテクチャ図でもない。

4. ネガティブプロンプト

写真写実にしない、3D にしない、複雑な UI スクリーンショットにしない、大量のコードを入れない、密集した小文字を入れない、複雑な表にしない、サイバーパンクにしない、ネオン色にしない、暗い背景にしない、カラフルな漫画調にしない、複雑な影を入れない、装飾を増やしすぎない、主要ノードは 8 個を超えない、背景の回路線を主体より目立たせない、長い日本語文章を生成しない。
