import numpy as np

F = np.array([200, 100, 50], dtype=float)
B = np.array([20, 40, 180], dtype=float)
a = 0.3
I = a * F + (1 - a) * B
print("合成结果", [int(round(v)) for v in I])
print("硬边 α=1 红通道:", int(F[0]), "α=0 红通道:", int(B[0]), "真实 α=0.3:", int(round(I[0])))

skin = np.array([230, 150, 120], dtype=float)
bright = np.minimum(skin * 1.3, 255)
print("提亮后", [int(round(v)) for v in bright])
