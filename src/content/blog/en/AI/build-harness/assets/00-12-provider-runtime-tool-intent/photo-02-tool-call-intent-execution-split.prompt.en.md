1. Diagram Type
Layered architecture, because this image places Tool Call, Tool Intent, and Tool Execution in three different responsibility domains, helping readers understand why one "tool call" must be split into three objects in a Harness.

2. Visual Element Checklist
Three layers: Provider protocol layer, Core semantic layer, Tool Runtime execution layer. Each layer has two nodes, for six total nodes. Top layer: Tool Call and Tool Delta. Middle layer: ToolIntent and Event Log. Bottom layer: Validate/Permission and Execution/Observation. Highlight ToolIntent and Execution in pale yellow. Use a faint layered grid in the background.

3. Positive Image Prompt
Create an in-article technical explanation diagram about the three-layer responsibility split between Tool Call, Tool Intent, and Tool Execution.

Style: off-white paper background, black hand-drawn pen linework with slightly uneven stroke width, a small amount of pale yellow highlight, editorial technical illustration, hand-drawn layered architecture diagram for a technical blog, clear and restrained with an engineering sketch feel.

Composition: vertical three-layer architecture. Top layer: "Provider Layer", with two nodes: 1. Tool Call, cloud message card icon, representing the provider's raw tool call. 2. Tool Delta, puzzle-fragment icon, representing streamed argument fragments. Middle layer: "Core Layer", with two nodes: 3. ToolIntent, tool card with question mark, highlighted in pale yellow, representing the unified action proposal. 4. Event Log, ledger icon, representing factual record. Bottom layer: "Runtime Layer", with two nodes: 5. Validate/Permission, shield and checkmark icon. 6. Execution/Observation, wrench and receipt icon, highlighted in pale yellow.

Use arrows from Tool Call / Tool Delta into ToolIntent, then from ToolIntent into Event Log and Runtime. Draw clear layer boundaries, with small lock icons near the boundaries to indicate responsibility isolation.

Background: faint circuit traces, node links, and engineering guides that do not overpower the subject.

Text: short labels only. Leave a bottom caption area for "tool call is not tool execution". If generated English text is unstable, leave it blank for later editing.

Overall, the image should feel like a hand-drawn mechanism diagram in a technical blog, not a product UI or formal architecture chart.

4. Negative Prompt
No photorealism, no 3D, no complex UI screenshots, no large code blocks, no dense tiny text, no complex tables, no cyberpunk, no neon colors, no dark background, no colorful cartoon style, no complex shadows, no excessive decoration, no more than 8 main nodes, do not make background circuit lines more prominent than the subject, do not generate long text.
