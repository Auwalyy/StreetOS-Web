import struct, zlib, os

def make_png(w, h, r, g, b):
    def chunk(name, data):
        c = struct.pack('>I', len(data)) + name + data
        return c + struct.pack('>I', zlib.crc32(name + data) & 0xffffffff)
    sig = b'\x89PNG\r\n\x1a\n'
    ihdr = chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0))
    row = b'\x00' + bytes([r, g, b]) * w
    idat = chunk(b'IDAT', zlib.compress(row * h))
    iend = chunk(b'IEND', b'')
    return sig + ihdr + idat + iend

assets = os.path.join(os.path.dirname(__file__), 'assets')
os.makedirs(assets, exist_ok=True)

files = {
    'icon.png': (1024, 1024),
    'adaptive-icon.png': (1024, 1024),
    'splash.png': (1284, 2778),
    'favicon.png': (196, 196),
}

for name, (w, h) in files.items():
    path = os.path.join(assets, name)
    with open(path, 'wb') as f:
        f.write(make_png(w, h, 249, 115, 22))
    print(f'Created {name} ({w}x{h})')
