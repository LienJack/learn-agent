import time
import numpy as np
import cv2

rng = np.random.default_rng(0)
base = cv2.GaussianBlur(rng.random((240, 320)).astype(np.float32), (0, 0), 3)
base = cv2.normalize(base, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
img2 = np.roll(base, shift=(2, 3), axis=(0, 1))
print('真实位移 (dx,dy) = (3.0, 2.0)')


def report(name, flow, t):
    c = flow[30:-30, 30:-30]
    print(f'{name}: 形状 {flow.shape} 平均 dx={c[..., 0].mean():.2f} dy={c[..., 1].mean():.2f} 耗时 {t * 1000:.1f} ms')


t0 = time.time()
fl = cv2.calcOpticalFlowFarneback(base, img2, None, 0.5, 3, 15, 3, 5, 1.2, 0)
report('Farneback', fl, time.time() - t0)

presets = [('DIS-ULTRAFAST', cv2.DISOPTICAL_FLOW_PRESET_ULTRAFAST),
           ('DIS-FAST', cv2.DISOPTICAL_FLOW_PRESET_FAST),
           ('DIS-MEDIUM', cv2.DISOPTICAL_FLOW_PRESET_MEDIUM)]
for name, p in presets:
    dis = cv2.DISOpticalFlow_create(p)
    t0 = time.time()
    fl = dis.calc(base, img2, None)
    report(name, fl, time.time() - t0)
