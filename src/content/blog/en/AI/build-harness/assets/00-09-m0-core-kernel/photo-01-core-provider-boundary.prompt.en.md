1. Figure Type
layered architecture diagram, because this image explains that a real LLM provider is connected to the core, while execution, state, and the event log remain controlled by the runtime.

2. Visual Element List
6 main nodes: CLI, Runtime Facade, Core Kernel, Provider Adapter, Real LLM, Tool Runtime. Inside Core Kernel, use 3 small labels: contracts, event bus, state. Highlight the Core Kernel and the ToolIntent boundary. Use icons for a terminal, console, chip, cloud interface, toolbox, and logbook.

3. Positive Image Prompt
Draw an in-article technical explanation image with the theme: "M0 Core Kernel connects real LLMs into the system, instead of letting the model take over the system."

Style: warm off-white paper background, black hand-drawn marker line art, slightly uneven line weight, a small amount of pale yellow highlighting, editorial technical illustration, hand-drawn flowchart for a technical blog, clear, restrained, with an engineering sketch feeling.

Composition: layered architecture diagram. On the left, draw a CLI terminal icon with an arrow entering a Runtime Facade console in the middle. In the center, draw a larger Core Kernel panel containing three short labels: contracts, event bus, state. On the upper right, draw a Provider Adapter connected to a Real LLM cloud interface; its arrows return only ModelEvent and ToolIntent. On the lower right, draw a Tool Runtime toolbox, but use dashed lines to show that this is the execution layer for later chapters. Draw a clear boundary line showing that the provider cannot cross the core to execute tools directly.

Highlight: use pale yellow to emphasize the Core Kernel panel and the arrow where the Provider Adapter returns ToolIntent to the Core Kernel.

Background: very faint circuit lines, node links, and engineering sketch guide lines; they must not compete with the main subject. Use short English-only visible labels for every node. Leave a blank pull quote area at the bottom for text to be added later. Use English-only visible text. The overall feeling should be like a hand-drawn mechanism diagram in a technical blog, not a product UI and not a formal architecture diagram.

4. Negative Prompt
No photorealism, no 3D, no complex UI screenshots, no large blocks of code, no dense tiny text, no complex tables, no cyberpunk, no neon colors, no dark background, no colorful cartoon style, no complex shadows, no excessive decoration, no more than 6 main nodes, no background circuit lines more prominent than the main subject, no long text, no non-English visible text.
