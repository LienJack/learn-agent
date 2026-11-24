import numpy as np
import cv2

rng = np.random.default_rng(0)
h = w = 32
fg = rng.uniform(0.3, 0.8, (h, w, 3)).astype(np.float32)
bg = rng.uniform(0.1, 0.5, (h, w, 3)).astype(np.float32)
bg[..., 0] *= 0.5
bg[..., 2] += 0.3

yy, xx = np.mgrid[0:h, 0:w]
r = np.hypot(yy - 15.5, xx - 15.5)
alpha = np.clip((14 - r) / 6, 0, 1).astype(np.float32)

red = cv2.cvtColor(np.array([[[1.0, 0.0, 0.0]]], dtype=np.float32), cv2.COLOR_RGB2LAB)[0, 0]
print("红色 L≈53、a>0、b>0:", bool(abs(red[0] - 53.2) < 1 and red[1] > 0 and red[2] > 0))
white8 = cv2.cvtColor(np.array([[[255, 255, 255]]], dtype=np.uint8), cv2.COLOR_RGB2LAB)[0, 0]
print("8-bit 白色 Lab:", [int(v) for v in white8])

fg_lab = cv2.cvtColor(fg, cv2.COLOR_RGB2LAB)
bg_lab = cv2.cvtColor(bg, cv2.COLOR_RGB2LAB)

l2 = fg_lab.copy()
l2[..., 0] *= 1.3
print("只改 L 时 a、b 不变:", bool(np.array_equal(l2[..., 1:], fg_lab[..., 1:])))

wt = alpha.astype(np.float64)[..., None]
f64 = fg_lab.astype(np.float64)
mu_s = (wt * f64).sum((0, 1)) / wt.sum()
sd_s = np.sqrt((wt * (f64 - mu_s) ** 2).sum((0, 1)) / wt.sum())
mu_t = bg_lab.astype(np.float64).mean((0, 1))
sd_t = bg_lab.astype(np.float64).std((0, 1))
trans = (f64 - mu_s) / sd_s * sd_t + mu_t

for s in (0.0, 0.6, 1.0):
    lab = f64 + s * (trans - f64)
    mu = (wt * lab).sum((0, 1)) / wt.sum()
    diff = np.abs(mu - mu_t)
    print(f"s={s:.1f} 平均差距 L/a/b = {np.round(diff, 1).tolist()}, 皆小于 5: {bool((diff < 5).all())}")

lab1 = (f64 + 1.0 * (trans - f64)).astype(np.float32)
rgb = np.clip(cv2.cvtColor(lab1, cv2.COLOR_LAB2RGB), 0, 1)
out = alpha[..., None] * rgb + (1 - alpha[..., None]) * bg
soft = int(((alpha > 0.05) & (alpha < 0.95)).sum())
print("合成输出形状", out.shape, "，alpha 渐层像素数大于 0:", soft > 0)
