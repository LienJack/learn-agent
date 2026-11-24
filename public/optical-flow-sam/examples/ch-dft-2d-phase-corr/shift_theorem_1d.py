import numpy as np

def fmt(v):
    v = complex(np.round(v, 6))
    return f'{v.real + 0.0:.0f}{v.imag + 0.0:+.0f}j'

x = np.array([1, 2, 3, 4], dtype=float)
N = len(x)
a = 1
xs = np.roll(x, a)  # [4, 1, 2, 3]
X = np.fft.fft(x)
Xs = np.fft.fft(xs)
k = np.arange(N)
pred = X * np.exp(-2j * np.pi * k * a / N)
for i in range(N):
    print(f'k={i}: 直接算 {fmt(Xs[i])}，公式算 {fmt(pred[i])}')
print('大小不变:', bool(np.allclose(np.abs(X), np.abs(Xs))))

# 二维
rng = np.random.default_rng(1)
f = rng.random((8, 16))
M, W = f.shape
dy, dx = 3, 5
g = np.roll(f, (dy, dx), axis=(0, 1))
kk = np.arange(M)[:, None]
ll = np.arange(W)[None, :]
phase = np.exp(-2j * np.pi * (kk * dy / M + ll * dx / W))
print('二维位移定理成立:', bool(np.allclose(np.fft.fft2(g), np.fft.fft2(f) * phase)))
print('二维大小不变:', bool(np.allclose(np.abs(np.fft.fft2(g)), np.abs(np.fft.fft2(f)))))
