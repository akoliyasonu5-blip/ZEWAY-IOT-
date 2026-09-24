"""Read-only TCP packet probe for identifying a tracker's actual wire format.

Run: python3 protocol_probe.py 8090
Does not acknowledge, configure or decode a device. Run only on a trusted host.
"""
import socket
import sys
from datetime import datetime, timezone

MAX_BUFFER = 8192


def describe(chunk):
    if chunk.startswith(b'\x78\x78'):
        return 'binary 7878 prefix (GT06-like; protocol unconfirmed)'
    if chunk.startswith(b'\x79\x79'):
        return 'binary 7979 prefix (GT06-like; protocol unconfirmed)'
    if chunk.startswith(b'\x7e'):
        return 'binary 7E prefix (possibly JT/T 808; protocol unconfirmed)'
    if all(32 <= b <= 126 or b in (9, 10, 13) for b in chunk):
        return 'printable ASCII'
    return 'unknown/binary'


def serve(port):
    if not 1 <= port <= 65535:
        raise ValueError('port must be between 1 and 65535')
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as server:
        server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        server.bind(('0.0.0.0', port))
        server.listen(10)
        print(f'Read-only packet probe listening on TCP {port}', flush=True)
        while True:
            conn, address = server.accept()
            with conn:
                conn.settimeout(30)
                print(f'Connection from {address[0]}', flush=True)
                total = 0
                try:
                    while total < MAX_BUFFER:
                        chunk = conn.recv(min(4096, MAX_BUFFER - total))
                        if not chunk:
                            break
                        total += len(chunk)
                        now = datetime.now(timezone.utc).isoformat(timespec='seconds')
                        print(f'{now} {len(chunk)} bytes {describe(chunk)}: {chunk[:128].hex(" ")}', flush=True)
                except socket.timeout:
                    pass
                print(f'Connection ended ({total} captured bytes)', flush=True)


if __name__ == '__main__':
    serve(int(sys.argv[1]) if len(sys.argv) > 1 else 8090)
