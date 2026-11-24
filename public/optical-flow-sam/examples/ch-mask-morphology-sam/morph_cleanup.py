import numpy as np
import cv2


def build_mask():
    m = np.zeros((20, 20), np.uint8)
    m[5:15, 5:15] = 1      # 身体 10x10
    m[9, 9] = 0            # 单像素小洞
    m[9:11, 15:20] = 1     # 2 像素宽的细臂
    for r, c in [(1, 1), (1, 18), (18, 18)]:
        m[r, c] = 1        # 三粒杂点
    return m


def count(m):
    n, _ = cv2.connectedComponents(m, connectivity=8)
    return n - 1


def area_filter(m, min_area, connectivity=8):
    n, lab, stats, _ = cv2.connectedComponentsWithStats(m, connectivity=connectivity)
    out = np.zeros_like(m)
    for i in range(1, n):
        if stats[i, cv2.CC_STAT_AREA] >= min_area:
            out[lab == i] = 1
    return out


def fill_holes(m, max_hole):
    inv = (1 - m).astype(np.uint8)
    inv_keep = area_filter(inv, max_hole + 1, connectivity=4)
    return (1 - inv_keep).astype(np.uint8)


m = build_mask()
k3 = np.ones((3, 3), np.uint8)
print(f'原始：面积={int(m.sum())}，连通块={count(m)}')

opened = cv2.morphologyEx(m, cv2.MORPH_OPEN, k3)
print(f'3×3 开运算后面积={int(opened.sum())}')
closed = cv2.morphologyEx(opened, cv2.MORPH_CLOSE, k3)
print(f'清理后：面积={int(closed.sum())}，连通块={count(closed)}')

filtered = area_filter(m, 20)
print(f'面积过滤后：面积={int(filtered.sum())}')
filled = fill_holes(filtered, 5)
print(f'面积过滤＋填洞：面积={int(filled.sum())}，连通块={count(filled)}')

k11 = np.ones((11, 11), np.uint8)
big = cv2.morphologyEx(m, cv2.MORPH_OPEN, k11)
print(f'11×11 开运算后面积={int(big.sum())}')

blk = np.zeros((20, 20), np.uint8)
blk[5:15, 5:15] = 1
k5 = np.ones((5, 5), np.uint8)
print(f'5×5 侵蚀后面积={int(cv2.erode(blk, k5).sum())}')
print(f'5×5 膨胀后面积={int(cv2.dilate(blk, k5).sum())}')
