1. Figure Type
Horizontal pipeline diagram, because this image shows how a provider's raw stream is normalized into `ModelEvent` objects that the Runtime can consume.

2. Visual Element List
Six main nodes: User Input, ChatRequest, Raw Stream, Adapter Normalize, ModelEvent, CLI Output / Session Record. Represent Raw Stream with fragmented token dots and small event blocks. Highlight ModelEvent in pale yellow. Let CLI Output and Session Record form a small output fork.

3. Positive Image Prompt
Draw an in-article technical explainer image about "streaming is not direct raw chunk printing; it is normalization into ModelEvent."

Style: off-white paper background, black hand-drawn marker line art, slightly uneven line weight, sparse pale-yellow highlights, editorial technical illustration, hand-drawn technical blog flowchart, clear, restrained, with an engineering sketch feel.

Composition: left-to-right horizontal pipeline. 1. "User Input": terminal window with a short cursor. 2. "`ChatRequest`": protocol form card. 3. "Raw Stream": a cloud emitting fragmented token dots and small event blocks, representing provider-specific events. 4. "Adapter Normalize": funnel or converter that turns fragmented events into a unified shape. 5. "`ModelEvent`": a stack of event cards highlighted in pale yellow, with short labels including `text_delta`, `message_stop`, and `error`. 6. Output fork: above is "CLI Output" as a terminal printing text; below is "Session Record" as a logbook.

Highlight: use pale yellow to emphasize the ModelEvent node and the arrow from Adapter Normalize to ModelEvent.

Background: very faint circuit traces, node links, and engineering sketch guide lines. They must stay subtle and not compete with the main subject.

Text: all visible labels must be in English only. Keep node labels short. At the bottom, leave room for the handwritten pull quote: "CLI displays text; Runtime consumes events."

Overall feel: like a hand-drawn mechanism diagram in a technical blog, not a product UI and not a formal architecture diagram. Elements should be clear, hierarchy should be obvious, and arrow relationships should be unambiguous.

4. Negative Prompt
No photorealism, no 3D, no complex UI screenshots, no large blocks of code, no dense tiny text, no complex tables, no cyberpunk, no neon colors, no dark background, no colorful cartoon style, no complex shadows, no excessive decoration, no more than 7 main nodes, no background circuitry more prominent than the main subject, no non-English text, no non-English visible labels, no malformed words.
