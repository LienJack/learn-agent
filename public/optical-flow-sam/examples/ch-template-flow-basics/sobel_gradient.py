import numpy as np

I1 = np.fromfunction(lambda r, c: 10.0 * c + 5.0 * r, (8, 8))
I2 = np.fromfunction(lambda r, c: 10.0 * (c - 1) + 5.0 * r, (8, 8))  # 整张右移 1 格

kx = np.array([[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]]) / 8.0
ky = np.array([[-1, -2, -1], [0, 0, 0], [1, 2, 1]]) / 8.0

patch = I1[3:6, 3:6]
ix = (patch * kx).sum()
iy = (patch * ky).sum()
it = I2[4, 4] - I1[4, 4]
print(f'Ix = {ix}, Iy = {iy}')
print(f'It = {it}')
u, v = 1.0, 0.0
print(f'Ix*u + Iy*v + It = {ix * u + iy * v + it}')
