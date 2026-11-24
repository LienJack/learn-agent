import numpy as np

rng = np.random.default_rng(0)
f = rng.random((6, 8))
M, N = f.shape

# 依定义的四重回圈
F = np.zeros((M, N), dtype=complex)
for k in range(M):
    for l in range(N):
        s = 0j
        for m in range(M):
            for n in range(N):
                s += f[m, n] * np.exp(-2j * np.pi * (k * m / M + l * n / N))
        F[k, l] = s

ref = np.fft.fft2(f)
rowcol = np.fft.fft(np.fft.fft(f, axis=1), axis=0)
print('依定义计算与 fft2 最大误差小于 1e-9:', bool(np.max(np.abs(F - ref)) < 1e-9))
print('先列后行与 fft2 最大误差小于 1e-9:', bool(np.max(np.abs(rowcol - ref)) < 1e-9))

# 二维卷积定理：核 h 只有三个非零权重
h = np.zeros((M, N))
h[0, 0] = 0.5
h[0, 1] = 0.25
h[1, 0] = 0.25
direct = 0.5 * f + 0.25 * np.roll(f, 1, axis=1) + 0.25 * np.roll(f, 1, axis=0)
viafft = np.real(np.fft.ifft2(np.fft.fft2(f) * np.fft.fft2(h)))
print('二维卷积定理成立:', bool(np.allclose(direct, viafft)))
