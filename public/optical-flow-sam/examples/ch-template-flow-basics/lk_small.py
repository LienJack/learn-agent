import numpy as np


def f(x, y):
    return np.sin(0.5 * x) + np.cos(0.6 * y) + 0.5 * np.sin(0.4 * (x - y))


ys, xs = np.mgrid[0:40, 0:40].astype(float)
u_true, v_true = 0.3, -0.2
I1 = f(xs, ys)
I2 = f(xs - u_true, ys - v_true)  # 内容往 (+u, +v) 方向移动

Iy, Ix = np.gradient(I1)  # axis0 是 y、axis1 是 x
It = I2 - I1

r, c = 20, 20
sl = (slice(r - 3, r + 4), slice(c - 3, c + 4))
ix, iy, it = Ix[sl].ravel(), Iy[sl].ravel(), It[sl].ravel()
A = np.array([[(ix * ix).sum(), (ix * iy).sum()],
              [(ix * iy).sum(), (iy * iy).sum()]])
b = -np.array([(ix * it).sum(), (iy * it).sum()])
u, v = np.linalg.solve(A, b)
print(f'估计 (u, v) = ({u:.2f}, {v:.2f})，真值 = ({u_true}, {v_true})')
err = max(abs(u - u_true), abs(v - v_true))
print('估计误差 < 0.1：', err < 0.1)
