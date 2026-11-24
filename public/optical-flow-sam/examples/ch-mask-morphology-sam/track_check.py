import numpy as np

H = W = 40


def sq(t):
    m = np.zeros((H, W), np.uint8)
    c = 5 + 2 * t
    m[15:25, c:c + 10] = 1
    return m


def iou(a, b):
    i = np.logical_and(a, b).sum()
    u = np.logical_or(a, b).sum()
    return 1.0 if u == 0 else i / u


def warp(m, dx):
    return np.roll(m, dx, axis=1)


def check(masks, dx=2, thr=0.5):
    scores = [iou(warp(masks[t - 1], dx), masks[t]) for t in range(1, len(masks))]
    flagged = [t for t, s in enumerate(scores, 1) if s < thr]
    return scores, flagged


truth = [sq(t) for t in range(6)]
pred = [m.copy() for m in truth]
pred[3] = np.zeros((H, W), np.uint8)

scores, flagged = check(pred)
print('相邻帧 IoU：' + ', '.join(f'{s:.2f}' for s in scores))
print(f'可疑帧：{flagged}')
print(f'第一个可疑帧：{flagged[0]}')

pred[3] = truth[3].copy()
_, flagged2 = check(pred)
print(f'补提示后可疑帧：{flagged2}')

m = truth[0]
for _ in range(5):
    m = warp(m, 1)
print(f'光流单独传播 5 帧后 IoU={iou(m, truth[5]):.2f}')
