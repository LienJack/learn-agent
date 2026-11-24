import numpy as np

A = np.array([[2.0, 0.5], [0.5, 1.0]])
b1 = np.array([1.0, -1.0])
d = np.array([3.0, 2.0])
b2 = b1 - 2 * A @ d
d_est = -0.5 * np.linalg.inv(A) @ (b2 - b1)
print('还原位移 d =', np.round(d_est, 3))
