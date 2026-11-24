import numpy as np

x = np.array([2, 8, 5, 5, 11, 2])
print('三日移动平均(valid):', (np.convolve(x, np.ones(3), 'valid') / 3).round(6).tolist())
print('差分(valid):', np.convolve(x, [1, -1], 'valid').tolist())
print('full 长度:', len(np.convolve(x, np.ones(3))))
print('valid 长度:', len(np.convolve(x, np.ones(3), 'valid')))
