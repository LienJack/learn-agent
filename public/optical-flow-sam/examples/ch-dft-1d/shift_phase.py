import numpy as np

n = np.arange(8)
x = 2 * np.cos(2 * np.pi * n / 8) + np.cos(2 * np.pi * 3 * n / 8)


def ph(z):
    return round(float(np.degrees(np.angle(z))), 1) + 0.0


for s in (0, 1):
    X = np.fft.fft(np.roll(x, s))
    print(f'平移 {s}: 幅度 k=1,3 = {abs(X[1]):.1f}, {abs(X[3]):.1f}；相位(度) k=1,3 = {ph(X[1]):.1f}, {ph(X[3]):.1f}')
