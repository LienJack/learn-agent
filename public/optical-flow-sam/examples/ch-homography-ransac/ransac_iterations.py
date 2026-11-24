import math
import numpy as np
import cv2


def need(w, s=4, p=0.99):
    return math.ceil(math.log(1 - p) / math.log(1 - w ** s))


for w in (0.7, 0.5, 0.3):
    print(f'内点比例 {w:.0%} → 需要 {need(w)} 次')

a = np.array([[10.0, 20.0], [30.0, 40.0]])
fx, fy = 0.25, 0.5
top = a[0, 0] * (1 - fx) + a[0, 1] * fx
bot = a[1, 0] * (1 - fx) + a[1, 1] * fx
print(f'双线性插值结果 {top * (1 - fy) + bot * fy:.1f}')


def apply(H, p):
    q = np.hstack([p, np.ones((len(p), 1))]) @ H.T
    return q[:, :2] / q[:, 2:3]


rng = np.random.default_rng(0)
cv2.setRNGSeed(0)
Ht = np.array([[1.0, 0.2, 30], [0.05, 1.1, 10], [0.0005, 0.0002, 1]])
n = 200
src = rng.uniform(0, 640, (n, 2))
dst = apply(Ht, src) + rng.normal(0, 0.5, (n, 2))
bad = rng.random(n) < 0.4
dst[bad] = rng.uniform(0, 640, (int(bad.sum()), 2))
s32, d32 = src.astype(np.float32), dst.astype(np.float32)

H0, _ = cv2.findHomography(s32, d32, 0)
H1, mask = cv2.findHomography(s32, d32, cv2.RANSAC, 3.0)
e0 = np.linalg.norm(apply(H0, src) - dst, axis=1)
e1 = np.linalg.norm(apply(H1, src) - dst, axis=1)
inl = mask.ravel() == 1
print(f'全部点最小二乘：误差中位数 {np.median(e0[~bad]):.2f} 像素（只看真正的好点）')
print(f'RANSAC：内点 {int(inl.sum())} 个，内点误差中位数 {np.median(e1[inl]):.2f} 像素')
