import numpy as np

x = np.array([1, 2, 3, 4], dtype=float)
h = np.array([1, 1, 0, 0], dtype=float)
N = len(x)

# 直接做循环卷积：y[n] = sum_m h[m] * x[(n-m) mod N]
y = np.array([sum(h[m] * x[(n - m) % N] for m in range(N)) for n in range(N)])
print('直接循环卷积:', y.astype(int).tolist())

# 走频率路线：DFT、逐点相乘、反 DFT
X = np.fft.fft(x)
H = np.fft.fft(h)
y2 = np.fft.ifft(X * H).real
print('频率相乘再反变换:', np.round(y2).astype(int).tolist())
print('两者一致:', bool(np.allclose(y, y2)))
