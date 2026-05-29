1. Diagram Type
Decision path, because this image splits failures by ownership: provider error, intent error, validation error, permission event, and tool error, each flowing to a different handling path.

2. Visual Element Checklist
A central "error source" decision diamond. Five outgoing paths: ProviderError, IntentError, ValidationError, PermissionEvent, ToolError. Each path has a small icon and handling result. Highlight the separation between ProviderError and ToolError in pale yellow. Use faint circuit lines in the background.

3. Positive Image Prompt
Create an in-article technical explanation diagram about why Provider Error is not Tool Error, and why errors must be routed by responsibility layer.

Style: off-white paper background, black hand-drawn pen linework with slightly uneven stroke width, a small amount of pale yellow highlight, editorial technical illustration, hand-drawn decision path diagram for a technical blog, clear, restrained, with an engineering sketch feel.

Composition: center decision diamond with warning triangle icon, label "Error source". From the center, draw five hand-drawn arrow paths to the right and downward: 1. ProviderError: disconnected cloud API icon, label "Provider", result "retry / fallback", highlighted in pale yellow. 2. IntentError: broken JSON card icon, label "Intent parse", result "re-emit intent". 3. ValidationError: checklist with cross icon, label "Validation", result "block execution". 4. PermissionEvent: shield and person confirmation icon, label "Permission", result "ask / deny". 5. ToolError: smoking wrench icon, label "Tool failed", result "write observation", highlighted in pale yellow.

Draw a clear divider between ProviderError and ToolError to emphasize they are not the same failure. Use small receipt icons at path ends to show each writes a different event.

Background: faint circuit traces, node links, and engineering sketch guides that do not overpower the main diagram.

Text: short labels only. Leave a bottom caption area for "same failure word, different owner". If generated English text is unstable, leave it blank for later editing.

Overall, it should feel like a hand-drawn mechanism diagram in a technical blog, not a product UI or formal architecture diagram.

4. Negative Prompt
No photorealism, no 3D, no complex UI screenshots, no large code blocks, no dense tiny text, no complex tables, no cyberpunk, no neon colors, no dark background, no colorful cartoon style, no complex shadows, no excessive decoration, no more than 8 main nodes, do not make background circuit lines more prominent than the subject, do not generate long text.
