import numpy as np

x = np.array([1, 2, 0, -1])
N = len(x)


def fmt(z):
    re = round(float(z.real), 6) + 0.0
    im = round(float(z.imag), 6) + 0.0
    return f'{re:.1f}{im:+.1f}i'


X = np.array([sum(x[n] * np.exp(-2j * np.pi * k * n / N) for n in range(N)) for k in range(N)])
for k in range(N):
    print(f'X[{k}] = {fmt(X[k])}')
print('与 np.fft.fft 相符:', bool(np.allclose(X, np.fft.fft(x))))
back = np.fft.ifft(X).real
print('反变换还原:', (np.round(back, 6) + 0.0).tolist())
