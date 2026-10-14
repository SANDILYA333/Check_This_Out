import struct
import zlib
import os

def create_png(width, height, draw_fn):
    # PNG signature
    png_sig = b'\x89PNG\r\n\x1a\n'

    # IHDR chunk
    # width: 4 bytes, height: 4 bytes, bit depth: 1 (8), color type: 6 (RGBA), comp: 0, filter: 0, interlace: 0
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    ihdr_crc = zlib.crc32(b'IHDR' + ihdr_data)
    ihdr_chunk = struct.pack('>I', len(ihdr_data)) + b'IHDR' + ihdr_data + struct.pack('>I', ihdr_crc)

    # Raw pixel data with filter byte (0) per scanline
    raw_lines = []
    for y in range(height):
        line = bytearray([0])  # filter byte: none
        for x in range(width):
            r, g, b, a = draw_fn(x, y, width, height)
            line.extend([r, g, b, a])
        raw_lines.append(bytes(line))

    compressed = zlib.compress(b''.join(raw_lines), level=9)
    idat_crc = zlib.crc32(b'IDAT' + compressed)
    idat_chunk = struct.pack('>I', len(compressed)) + b'IDAT' + compressed + struct.pack('>I', idat_crc)

    # IEND chunk
    iend_crc = zlib.crc32(b'IEND')
    iend_chunk = struct.pack('>I', 0) + b'IEND' + struct.pack('>I', iend_crc)

    return png_sig + ihdr_chunk + idat_chunk + iend_chunk

def icon_painter(x, y, w, h):
    # Normalized coords from -1 to 1
    nx = (x / (w - 1)) * 2 - 1
    ny = (y / (h - 1)) * 2 - 1
    dist = (nx**2 + ny**2) ** 0.5

    # Rounded rectangle background (radius ~ 0.8)
    # Background color: vibrant indigo/blue (#2563eb = 37, 99, 235)
    r, g, b, a = 37, 99, 235, 255

    # Corner rounding
    corner_box = max(abs(nx), abs(ny))
    if corner_box > 0.85 and dist > 1.05:
        return 0, 0, 0, 0  # transparent outer edge

    # Microphone / Speaker silhouette in white
    # Mic capsule: center at (0, -0.15), width 0.35, height 0.6
    in_capsule = abs(nx) < 0.28 and -0.55 < ny < 0.15
    # Capsule rounded top/bottom
    top_circle = (nx**2 + (ny + 0.3)**2) ** 0.5 < 0.28
    bottom_circle = (nx**2 + (ny - 0.05)**2) ** 0.5 < 0.28

    # Mic stand U-shape arc
    u_arc = 0.32 < ((nx**2 + (ny - 0.05)**2) ** 0.5) < 0.46 and ny > -0.05 and ny < 0.45
    # Mic stand vertical bar
    stand_bar = abs(nx) < 0.08 and 0.4 <= ny <= 0.65
    # Mic stand base
    stand_base = abs(nx) < 0.35 and 0.65 <= ny <= 0.78

    if in_capsule or top_circle or bottom_circle or u_arc or stand_bar or stand_base:
        return 255, 255, 255, 255  # White symbol

    return r, g, b, a

def main():
    icons_dir = os.path.join(os.path.dirname(__file__), '..', 'public', 'icons')
    os.makedirs(icons_dir, exist_ok=True)

    sizes = [16, 32, 48, 128]
    for size in sizes:
        png_bytes = create_png(size, size, icon_painter)
        filename = f'icon{size}.png'
        filepath = os.path.join(icons_dir, filename)
        with open(filepath, 'wb') as f:
            f.write(png_bytes)
        print(f'Generated {filepath} ({len(png_bytes)} bytes)')

if __name__ == '__main__':
    main()
