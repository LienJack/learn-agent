1. Diagram Type
Decision path, because the focus is that after permission allow, a tool must still pass scheduling, concurrency checks, long-task handling, and sandbox before execution.

2. Visual Element Checklist
Seven main nodes: Permission Allow, Concurrency, Resource Key, Queue, Long Task, Sandbox, Execute. Permission Allow is the entry point. Concurrency and Long Task are decision diamonds. Sandbox uses a boundary box and is highlighted in pale yellow. Queue uses a queue icon. Execute uses a wrench and terminal window. Highlight both Scheduler decisions and Sandbox boundary in pale yellow. Leave a bottom caption area: "Allowed to execute does not mean execute immediately."

3. Positive Image Prompt
Create an in-article technical explanation diagram about how Tool Runtime schedules and isolates tool execution after permission allows it.

Style: off-white paper background, black hand-drawn pen linework with slightly uneven stroke width, a small amount of pale yellow highlight, editorial technical illustration, hand-drawn technical blog flowchart, clear, restrained, with an engineering sketch feel.

Composition: decision path from left to right with light branching. Entry node: Permission Allow with a shield icon. Then enter a Concurrency decision diamond with parallel arrows. Branch to Parallel Queue and Serial Queue nodes. Then enter a Resource Key node, representing resource locking by file path or shell session. Next enter a Long Task decision with a clock icon; one branch is Foreground, another is Background. All paths merge into a Sandbox boundary box highlighted in pale yellow, containing a small terminal and working directory icon, then connect to Execute.

Use faint circuit traces and engineering guides in the background. Keep labels short. Leave a bottom caption area for "Allowed to execute does not mean execute immediately". The image should feel like a hand-drawn mechanism diagram in a technical blog, not a formal BPMN diagram.

4. Negative Prompt
No photorealism, no 3D, no complex UI screenshots, no large code blocks, no dense tiny text, no complex tables, no cyberpunk, no neon colors, no dark background, no colorful cartoon style, no complex shadows, no excessive decoration, no more than 8 main nodes, do not make background circuit lines more prominent than the subject, do not generate long text.
