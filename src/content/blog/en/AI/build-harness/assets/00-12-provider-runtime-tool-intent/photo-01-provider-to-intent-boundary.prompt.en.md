1. Diagram Type
Horizontal pipeline, because this image explains the responsibility boundary from user goal through Core, Provider Runtime, ModelEvent, ToolIntent, and Tool Pipeline. The key point is that the provider may translate, but must not execute.

2. Visual Element Checklist
Six main nodes: User Goal, Core Runtime, Provider Runtime, ModelEvent, ToolIntent, Tool Pipeline. Draw a dashed line from Provider Runtime to Tool Pipeline blocked by a red cross, meaning direct execution is not allowed. Highlight ToolIntent and Tool Pipeline in pale yellow. Use faint circuit lines and engineering sketch guides in the background. Leave room for one short caption at the bottom.

3. Positive Image Prompt
Create an in-article technical explanation diagram about Provider Runtime translating model output into ToolIntent instead of executing tools directly.

Style: off-white paper background, black hand-drawn pen linework with slightly uneven stroke width, a small amount of pale yellow highlight, editorial technical illustration, hand-drawn technical blog flowchart, clear, restrained, with an engineering sketch feel.

Composition: horizontal pipeline. From left to right, include six key nodes connected by hand-drawn arrows: 1. User Goal: small terminal window icon, label "Fix tests". 2. Core Runtime: console dashboard icon, label "Core". 3. Provider Runtime: cloud API and plug icon, label "Provider". 4. ModelEvent: flowing token dots and document icon, label "Event". 5. ToolIntent: small tool card with question mark, label "Intent". 6. Tool Pipeline: wrench, shield, and queue icon, label "Pipeline".

Between Provider Runtime and Tool Pipeline, draw a thin dashed arrow blocked by a visible but restrained cross to show "no direct execution". The main flow must go from Provider Runtime to ModelEvent / ToolIntent, back to Core, and then into Tool Pipeline. Highlight ToolIntent and Tool Pipeline with pale yellow.

Background: very faint circuit traces, node links, and engineering guide lines that do not compete with the main elements.

Text: keep node labels short. Leave space at the bottom for a handwritten line: "provider is a translator, not an executor". If generated English text is unstable, leave a blank caption area for later editing.

Overall, it should feel like a hand-drawn mechanism diagram in a technical blog, not a product UI or formal architecture diagram. Elements should be clear, layered, and the arrow relationships obvious.

4. Negative Prompt
No photorealism, no 3D, no complex UI screenshots, no large code blocks, no dense tiny text, no complex tables, no cyberpunk, no neon colors, no dark background, no colorful cartoon style, no complex shadows, no excessive decoration, no more than 8 main nodes, do not make background circuit lines more prominent than the subject, do not generate long text.
