# ローカライズ済み画像プロンプト

スタイル: 温かいオフホワイトの紙背景、抑制された技術ブログ用ダイアグラム、黒いインク線、淡い黄色のハイライト、読みやすい短いラベル。写真風、3D、密な文字は避ける。

- `photo-01-action-control-plane.png`: Tool Manager を Intent、Tool View、Policy Gate、Runtime、Evidence をまたぐ行動制御面として示す。
- `photo-02-function-registry-risk.png`: 単純な function registry が permission gap、side effects、missing audit を隠すことを示す。
- `photo-03-tool-call-lifecycle.png`: Tool Call が request、validation、policy、approval、sandbox、result、evidence、state を通る lifecycle を示す。
- `photo-04-evidence-artifact-flow.png`: 完全な tool output が Artifact Store に入り、summary と reference だけが ContextBundle に入る流れを示す。
- `photo-05-registration-state-machine.png`: tool registration が discovery、parse、normalize、lint、health check、callable status を通ることを示す。
- `photo-06-intent-tool-resolution.png`: Intent が capability match、policy filter、context scope、risk rank を経て ToolView になる流れを示す。
- `photo-07-permission-sandbox-gates.png`: permission approval、credential、sandbox boundary、audit result が実行境界を守ることを示す。
- `photo-08-capability-source-map.png`: Builtin、CLI、Skill、MCP、Subagent が統一 governance に流れ込む構造を示す。
- `photo-09-agent-loop-tool-manager.png`: Agent Loop 内の Tool Manager が各 action 後に Artifact、State、Trace を書くことを示す。
- `photo-10-context-tool-runtime-map.png`: Context Manager が attention を制御し、Tool Manager が action を制御する二つの制御面を示す。
