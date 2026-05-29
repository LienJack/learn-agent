1. Figure Type
Layered architecture diagram, because the focus is the responsibility boundary between the model layer and the Runtime layer.

2. Visual Element List
The top layer is Model, which can only write a request form. The middle layer is Harness Runtime, containing Validate, Permission, and Scheduler. The bottom layer is the real world, including filesystem, Shell, Git, and tests. Draw the boundary as a thick black line, and highlight the Runtime layer and boundary line in pale yellow.

3. Positive Image Prompt
Draw an in-article technical explanatory illustration on the theme: "The model submits a request form; only Runtime can touch the external world."

Style: warm off-white paper background, black hand-drawn marker line art, slightly uneven line weight, a small amount of pale yellow highlighting, editorial technical illustration, hand-drawn flowchart for a technical blog, clear, restrained, with an engineering sketch feel.

Composition: three-layer architecture. The top layer is Model, drawn as a brain-shaped chip and a small request form labeled Intent. The middle layer is Harness Runtime, drawn as a console with three small modules: Validate, Permission, Scheduler. Lightly highlight the entire middle layer in pale yellow. Beneath the middle layer, draw a thick black boundary line labeled "Execution Boundary." The bottom layer is the real world, with four small icons: folder, terminal window, Git branch, and test check/cross, representing filesystem, Shell, Git, and test environment.

The arrow from Model to Runtime should carry only the request form. Execution arrows should appear only from Runtime to the real world. Add very faint circuit traces and engineering sketch guide lines in the background. Keep text labels short, with no long sentences. The whole image should communicate that the model does not directly own tools; the system owns execution authority. All visible labels and text in the image must be English only.

4. Negative Prompt
No photorealism, no 3D, no complex UI screenshots, no large blocks of code, no dense tiny text, no complex tables, no cyberpunk, no neon colors, no dark background, no colorful cartoon style, no complex shadows, no excessive decoration, no more than 8 main nodes, do not make the background circuit lines more prominent than the main subject, and do not generate any non-English visible text.
