"""Genera iconos PWA de kaipy: pin blanco sobre fondo carmesi, con esquinas redondeadas."""
import struct, zlib, os

def make_icon(size, path):
    # Paleta: carmesi #e11d48, blanco #ffffff
    bg = (225, 29, 72, 255)
    white = (255, 255, 255, 255)
    r = size * 0.22          # radio del circulo del pin
    cx, cy = size * 0.5, size * 0.42
    corner = size * 0.20     # radio de esquinas redondeadas
    tri_w = size * 0.30      # ancho de la punta del pin
    tri_bottom = size * 0.78

    rows = []
    for y in range(size):
        row = bytearray([0])  # filter type 0
        for x in range(size):
            # Esquina redondeada: fuera si esta en una esquina
            dx = max(corner - x, x - (size - 1 - corner), 0)
            dy = max(corner - y, y - (size - 1 - corner), 0)
            if dx * dx + dy * dy > corner * corner:
                px = (0, 0, 0, 0)
            else:
                # Pin: circulo + triangulo
                d = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5
                if d <= r:
                    px = white
                elif (y > cy + r * 0.55 and y <= tri_bottom
                      and abs(x - cx) <= tri_w * (y - cy - r * 0.55) / (tri_bottom - cy - r * 0.55)):
                    px = white
                else:
                    px = bg
            row += struct.pack('BBBB', *px)
        rows.append(bytes(row))

    raw = b''.join(rows)
    def chunk(tag, data):
        c = tag + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c))
    png = (b'\x89PNG\r\n\x1a\n'
           + chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0))
           + chunk(b'IDAT', zlib.compress(raw, 9))
           + chunk(b'IEND', b''))
    with open(path, 'wb') as f:
        f.write(png)
    print(f"{path}: {size}x{size} ({len(png)} bytes)")

os.makedirs(r"D:\PROCESO\kaipy\src\assets\img", exist_ok=True)
for s in (180, 192, 512):
    make_icon(s, rf"D:\PROCESO\kaipy\src\assets\img\icon-{s}.png")
