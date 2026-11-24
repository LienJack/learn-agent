import cmath
import math

z = 3 + 4j
print('乘 i 结果:', z * 1j)

e = cmath.exp(1j * math.pi)
print(f'e^(i*pi) 的实部 {e.real:.6f} 虚部 {e.imag:.6f}')

alpha, beta = 0.7, 1.9
left = cmath.exp(1j * alpha) * cmath.exp(1j * beta)
right = cmath.exp(1j * (alpha + beta))
print('角度相加检查:', abs(left - right) < 1e-12)
