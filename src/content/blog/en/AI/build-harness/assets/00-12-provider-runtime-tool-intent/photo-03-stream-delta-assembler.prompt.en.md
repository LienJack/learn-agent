1. Diagram Type
State sequence, because this image shows streaming tool-call deltas being assembled over time into a complete ToolIntent, and emphasizes that execution must not race ahead.

2. Visual Element Checklist
Six state nodes: text delta, tool start, args part 1, args part 2, complete intent, tool pipeline. Draw small lock icons under the first four states meaning "cannot execute". Highlight complete intent and tool pipeline in pale yellow. Connect everything with a timeline arrow. Leave a short caption area at the bottom.

3. Positive Image Prompt
Create an in-article technical explanation diagram about streaming tool-call deltas needing to assemble into a complete ToolIntent before execution.

Style: off-white paper background, black hand-drawn pen linework with slightly uneven stroke width, a small amount of pale yellow highlight, editorial technical illustration, hand-drawn state sequence diagram for a technical blog, clear, restrained, with an engineering sketch feel.

Composition: left-to-right state timeline. Include six key states connected by hand-drawn arrows: 1. text delta: small flowing token dots, label "Text". 2. tool start: opened tool card icon, label "Start". 3. args part 1: half JSON paper fragment, label "Args part". 4. args part 2: second JSON fragment, label "Assemble". 5. complete intent: complete tool intent card, label "Complete intent", highlighted in pale yellow. 6. tool pipeline: wrench and shield icon, label "Pipeline", highlighted in pale yellow.

Under the first four states, draw small lock or pause symbols to indicate "cannot execute". Only after the complete intent should the arrow enter the execution pipeline. Above the timeline, draw a thin line suggesting streaming flow.

Background: faint circuit traces, node links, and engineering guide lines that do not compete with the subject.

Text: short labels only. Leave a bottom caption area for "events may stream; execution must not race ahead". If generated English text is unstable, leave it blank for later editing.

Overall, it should feel like a hand-drawn mechanism diagram in a technical blog, not a product UI or formal architecture diagram.

4. Negative Prompt
No photorealism, no 3D, no complex UI screenshots, no large code blocks, no dense tiny text, no complex tables, no cyberpunk, no neon colors, no dark background, no colorful cartoon style, no complex shadows, no excessive decoration, no more than 8 main nodes, do not make background circuit lines more prominent than the subject, do not generate long text.
