import numpy as np

x = np.linspace(-5, 5, 21)
f1 = 2 * x**2 + x
d = 3
f2 = 2 * (x - d) ** 2 + (x - d)
a1, b1, c1 = np.polyfit(x, f1, 2)
a2, b2, c2 = np.polyfit(x, f2, 2)
print(f'a1={a1:.1f} b1={b1:.1f} b2={b2:.1f}')
print(f'估计位移 d = {-(b2 - b1) / (2 * a1):.1f}')
