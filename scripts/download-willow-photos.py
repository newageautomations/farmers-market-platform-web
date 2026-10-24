"""Download only the twelve individually reviewed Pexels photos in the manifest."""
import json, subprocess
from pathlib import Path
root = Path(__file__).resolve().parent.parent
folder = root / '.runtime/willow-photos'
folder.mkdir(parents=True, exist_ok=True)
for row in json.loads((root / 'scripts/willow-pexels.json').read_text(encoding='utf-8')):
    target = folder / row['filename']
    if not target.exists():
        subprocess.run(['curl.exe', '--fail', '--silent', '--show-error', '--max-time', '45', '--output', str(target), row['download']], check=True)
        data = target.read_bytes()
        if len(data) > 10_000_000 or not data.startswith(bytes.fromhex('ffd8')):
            raise ValueError('Expected bounded JPEG download')
        target.write_bytes(data)
    print(row['key'], target.stat().st_size)
