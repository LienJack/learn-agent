import numpy as np

sw = np.lib.stride_tricks.sliding_window_view


def ssd_map(img, tpl):
    h, w = tpl.shape
    return ((sw(img, (h, w)) - tpl) ** 2).sum(axis=(2, 3))


def ncc_map(img, tpl):
    h, w = tpl.shape
    t = tpl - tpl.mean()
    tn = np.sqrt((t ** 2).sum())
    wins = sw(img, (h, w))
    p = wins - wins.mean(axis=(2, 3), keepdims=True)
    pn = np.sqrt((p ** 2).sum(axis=(2, 3)))
    num = (p * t).sum(axis=(2, 3))
    den = pn * tn
    out = np.full(num.shape, -1.0)
    ok = den > 1e-9
    out[ok] = num[ok] / den[ok]
    return out


img = np.full((6, 6), 10.0)
img[2:4, 2:4] = [[110, 120], [100, 90]]
img[4:6, 4:6] = [[60, 70], [80, 90]]
tpl = np.array([[80, 90], [70, 60]], dtype=float)

ssd = ssd_map(img, tpl)
ncc = ncc_map(img, tpl)
r, c = np.unravel_index(ssd.argmin(), ssd.shape)
print(f'SSD 最佳位置 (r, c) = ({r}, {c})，SSD = {int(ssd[r, c])}')
print('真位置 (2,2) 的 SSD =', int(ssd[2, 2]))
r, c = np.unravel_index(ncc.argmax(), ncc.shape)
print(f'NCC 最佳位置 (r, c) = ({r}, {c})，NCC = {ncc[r, c]:.2f}')
print(f'干扰块 (4,4) 的 NCC = {ncc[4, 4]:.2f}')

# 较大的随机纹理图：亮度 x0.6 + 40，再加轻微杂讯
rng = np.random.default_rng(0)
big = rng.uniform(0, 255, (64, 64))
patch = big[20:32, 35:47].copy()
bright = 0.6 * big + 40 + rng.normal(0, 3, big.shape)
n = ncc_map(bright, patch)
r, c = np.unravel_index(n.argmax(), n.shape)
ok = max(abs(int(r) - 20), abs(int(c) - 35)) <= 1
print('大图测试：NCC 误差 <= 1 像素：', ok)
