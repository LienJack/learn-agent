1. Figure Type
Decision path diagram, because this image explains how a provider's raw error becomes a runtime-actionable error category and then branches into stop, retry, compaction, or configuration guidance.

2. Visual Element List
Seven main nodes: Raw Error, Adapter Mapping, ProviderError, Runtime Decision, Stop, Backoff Retry, Compact Context. Highlight ProviderError and Runtime Decision in pale yellow. Use a broken cloud interface icon for Raw Error and a forked road sign for Runtime Decision.

3. Positive Image Prompt
Draw an in-article technical explainer image about "error mapping turns model-call failure into Runtime decision input."

Style: off-white paper background, black hand-drawn marker line art, slightly uneven line weight, sparse pale-yellow highlights, editorial technical illustration, hand-drawn technical blog flowchart, clear, restrained, with an engineering sketch feel.

Composition: decision path diagram. On the left, show "Raw Error" as a broken cloud interface with error lightning. An arrow enters "Adapter Mapping," drawn as a small funnel or classifier. In the middle, show a unified "ProviderError" error card highlighted in pale yellow, with short labels including `auth`, `rate_limit`, and `context`. On the right, flow into "Runtime Decision," a forked-road-sign node also highlighted in pale yellow. Branch to three results: 1. "Stop + Config Hint," using a stop sign and key icon. 2. "Backoff Retry," using a clock and looping arrow. 3. "Compact Context," using a shrinking box and document icon.

Highlight: use pale yellow to emphasize ProviderError and Runtime Decision.

Background: very faint circuit traces, node links, and engineering sketch guide lines. They must stay subtle and not compete with the main subject.

Text: all visible labels must be in English only. Keep node labels short. At the bottom, leave room for the handwritten pull quote: "Errors are not strings; they are decision inputs."

Overall feel: like a hand-drawn mechanism diagram in a technical blog, not a product UI and not a formal architecture diagram. Elements should be clear, hierarchy should be obvious, and arrow relationships should be unambiguous.

4. Negative Prompt
No photorealism, no 3D, no complex UI screenshots, no large blocks of code, no dense tiny text, no complex tables, no cyberpunk, no neon colors, no dark background, no colorful cartoon style, no complex shadows, no excessive decoration, no more than 8 main nodes, no background circuitry more prominent than the main subject, no non-English text, no non-English visible labels, no malformed words.
