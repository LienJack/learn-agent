import numpy as np

def make_texture(h, w, seed):
    rng = np.random.default_rng(seed)
    noise = rng.standard_normal((h, w))
    fy = np.fft.fftfreq(h)[:, None]
    fx = np.fft.fftfreq(w)[None, :]
    lp = 1.0 / (1.0 + (fx ** 2 + fy ** 2) / 0.01)
    return np.real(np.fft.ifft2(np.fft.fft2(noise) * lp))

def phase_correlation(a, b, window=False, eps=1e-9):
    if window:
        win = np.hanning(a.shape[0])[:, None] * np.hanning(a.shape[1])[None, :]
        a = a * win
        b = b * win
    Fa = np.fft.fft2(a)
    Fb = np.fft.fft2(b)
    cross = Fb * np.conj(Fa)
    R = cross / (np.abs(cross) + eps)
    r = np.real(np.fft.ifft2(R))
    iy, ix = np.unravel_index(np.argmax(r), r.shape)
    H, W = r.shape
    dy = iy - H if iy > H // 2 else iy
    dx = ix - W if ix > W // 2 else ix
    return (int(dy), int(dx)), r, (int(iy), int(ix))

def parabola(a, b, c):
    d = a - 2 * b + c
    return 0.0 if d == 0 else (a - c) / (2 * d)

def subpixel(r, iy, ix):
    H, W = r.shape
    oy = parabola(r[(iy - 1) % H, ix], r[iy, ix], r[(iy + 1) % H, ix])
    ox = parabola(r[iy, (ix - 1) % W], r[iy, ix], r[iy, (ix + 1) % W])
    return oy, ox

# 1. 循环平移：B[y, x] = A[y-7, x+12]，真值 (dy, dx) = (7, -12)
A = make_texture(64, 64, 0)
B = np.roll(A, (7, -12), axis=(0, 1))
est, _, _ = phase_correlation(A, B)
print(f'估计平移 (dy, dx) = {est}')

# 2. 非循环平移（裁切），真值 (5, -3)，比较有无加窗
big = make_texture(160, 160, 1)
A2 = big[40:104, 40:104]
B2 = big[35:99, 43:107]
e1, _, _ = phase_correlation(A2, B2, window=False)
e2, _, _ = phase_correlation(A2, B2, window=True)
print(f'裁切图像、不加窗: {e1}；加汉宁窗: {e2}；真值 (5, -3)')

# 3. 小数平移：用傅里叶位移产生 dy=2, dx=3.4
fy = np.fft.fftfreq(64)[:, None]
fx = np.fft.fftfreq(64)[None, :]
B3 = np.real(np.fft.ifft2(np.fft.fft2(A) * np.exp(-2j * np.pi * (fy * 2.0 + fx * 3.4))))
est3, r3, (iy, ix) = phase_correlation(A, B3)
oy, ox = subpixel(r3, iy, ix)
print(f'整数估计 {est3}，子像素估计 dx 约 {est3[1] + ox:.2f}（真值 3.4）')
