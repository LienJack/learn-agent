import numpy as np

H = W = 20


def box(r0, r1, c0, c1):
    m = np.zeros((H, W), bool)
    m[r0:r1, c0:c1] = True
    return m


cands = {
    'A': (box(2, 6, 8, 12), 0.90),     # 只有脸
    'B': (box(2, 18, 6, 14), 0.88),    # 整个人
    'C': (np.ones((H, W), bool), 0.70),  # 整张图
    'E': (box(2, 18, 6, 17), 0.92),    # 人加旁边的人
}


def select(cands, pos, neg, max_frac=0.5):
    best, best_score = None, -1.0
    for name, (m, s) in cands.items():
        if not all(m[r, c] for r, c in pos):
            continue
        if any(m[r, c] for r, c in neg):
            continue
        if m.sum() / m.size > max_frac:
            continue
        if s > best_score:
            best, best_score = name, s
    return best


pos = [(10, 9)]
print('无负点：' + select(cands, pos, []))
print('加负点：' + select(cands, pos, [(10, 15)]))
