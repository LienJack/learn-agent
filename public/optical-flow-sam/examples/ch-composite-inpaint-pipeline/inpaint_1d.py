import numpy as np

print('一维线性填补', np.interp([3, 4, 5], [2, 6], [30, 70]).tolist())

rng = np.random.default_rng(0)
f0 = rng.integers(0, 255, size=24).astype(float)
f1 = np.roll(f0, 2)
hole = np.arange(8, 12)

lin = f0.copy()
lin[hole] = np.interp(hole, [7, 12], [f0[7], f0[12]])
err_lin = np.abs(lin[hole] - f0[hole]).max()

borrow = f0.copy()
borrow[hole] = f1[hole + 2]
err_b = np.abs(borrow[hole] - f0[hole]).max()

print('光流借像素最大误差 =', err_b)
print('线性插值最大误差大于 0 =', bool(err_lin > 0))
