import numpy as np

img = np.full((6, 6), 10.0)
tpl = np.array([[80, 90], [70, 60]], dtype=float)
img[2:4, 2:4] = tpl


def ssd_map(img, tpl):
    h, w = tpl.shape
    H, W = img.shape
    out = np.zeros((H - h + 1, W - w + 1))
    for r in range(out.shape[0]):
        for c in range(out.shape[1]):
            out[r, c] = ((img[r:r + h, c:c + w] - tpl) ** 2).sum()
    return out


m = ssd_map(img, tpl)
print('SSD 图大小', m.shape)
print('位置 (0,0) 的 SSD =', int(m[0, 0]))
print('位置 (2,1) 的 SSD =', int(m[2, 1]))
r, c = np.unravel_index(m.argmin(), m.shape)
print(f'最佳位置 (r, c) = ({r}, {c})，SSD = {int(m[r, c])}')
