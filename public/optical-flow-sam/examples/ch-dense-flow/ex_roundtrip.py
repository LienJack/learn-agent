import numpy as np

fw = (3, 1)


def err(fw, bw):
    return float(np.hypot(fw[0] + bw[0], fw[1] + bw[1]))


print(f'一致 → 往返误差 = {err(fw, (-3, -1)):.3f}')
print(f'遮挡 → 往返误差 = {err(fw, (0, 0)):.3f}')
print('双线性插值 1.5 处 =', np.interp(1.5, [0, 1, 2], [10.0, 20.0, 30.0]))
h, w = 1024 // 8, 448 // 8
n = (h * w) ** 2
print(f'相关体元素数 = {n}  约 {n * 4 / 1e6:.0f} MB')
