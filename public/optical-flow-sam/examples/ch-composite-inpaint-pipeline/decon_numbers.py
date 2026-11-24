import numpy as np

alpha = np.array([0, 0.25, 0.5, 0.75, 1.0])
F = 200.0
B_old = 40.0
B_new = 240.0
I = alpha * F + (1 - alpha) * B_old
naive = alpha * I + (1 - alpha) * B_new
F_est = np.where(alpha > 0.05, (I - (1 - alpha) * B_old) / np.maximum(alpha, 1e-6), I)
good = alpha * F_est + (1 - alpha) * B_new
truth = alpha * F + (1 - alpha) * B_new
print('直接贴最大误差 =', float(np.abs(naive - truth).max()))
print('去色溢后最大误差 =', round(float(np.abs(good - truth).max()), 6))

a = np.array([0, 0, 0, 1, 1, 1.0])
p = np.pad(a, 1, mode='edge')
soft = (p[:-2] + 2 * p[1:-1] + p[2:]) / 4
print('羽化后', soft.tolist())
