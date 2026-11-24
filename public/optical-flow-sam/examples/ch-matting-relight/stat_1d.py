import numpy as np

x = np.array([40, 50, 60, 70], dtype=float)
mu_s, sd_s = x.mean(), x.std()
mu_t, sd_t = 80.0, 5.0
y = (x - mu_s) / sd_s * sd_t + mu_t
print(f"原本 平均 {mu_s:.1f}，标准差 {sd_s:.2f}")
print("转换后", np.round(y, 2).tolist())
print(f"新平均 {y.mean():.1f}，新标准差 {y.std():.1f}")
