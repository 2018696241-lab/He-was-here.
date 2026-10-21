"""Create public artifacts from an explicit allowlist. Never includes signing files."""
from pathlib import Path
import hashlib
import json
import shutil
import zipfile

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT.parent / "发布文件"
RELEASE = json.loads((ROOT / "release.json").read_text(encoding="utf-8"))
STAMP = (2026, 10, 20, 0, 0, 0)
EXCLUDED = {"node_modules", ".git", ".gradle", ".kotlin", "__pycache__", "build", "artifacts", "验收"}
DIRECTORIES = {"web", "tests", "tools", "docs", "android", ".github", "server-reference"}
FILES = {"README.md", "package.json", "package-lock.json", "release.json", ".gitignore"}

def public_source(path):
    rel = path.relative_to(ROOT)
    if (len(rel.parts) == 1 and rel.name not in FILES) or (len(rel.parts) > 1 and rel.parts[0] not in DIRECTORIES):
        return False
    if any(p in EXCLUDED for p in rel.parts):
        return False
    if path.name in {"keystore.properties", "local.properties", ".env"}:
        return False
    if path.suffix.lower() in {".jks", ".keystore", ".pem", ".key"}:
        return False
    if rel.as_posix().startswith("android/app/src/main/assets/"):
        return False
    return True

def archive(target, base, paths):
    with zipfile.ZipFile(target, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for p in sorted(paths):
            info = zipfile.ZipInfo(p.relative_to(base).as_posix(), STAMP)
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = (0o755 if p.name == "gradlew" else 0o644) << 16
            z.writestr(info, p.read_bytes())

def main():
    OUT.mkdir(exist_ok=True)
    apk = ROOT / "android/app/build/outputs/apk/release/app-release.apk"
    if not apk.exists():
        raise SystemExit("Build and sign app-release.apk before packaging.")
    version = RELEASE["version"]
    archive(OUT / f"人曾在此-{version}-源码.zip", ROOT,
            [p for p in ROOT.rglob("*") if p.is_file() and public_source(p)])
    web = ROOT / "artifacts/web"
    archive(OUT / f"人曾在此-{version}-网页静态.zip", web,
            [p for p in web.rglob("*") if p.is_file()])
    for name in ["人曾在此-离线版.html", "人曾在此-离线选择题版.html"]:
        shutil.copy2(ROOT / "artifacts" / name, OUT / name)
    shutil.copy2(apk, OUT / f"人曾在此-{version}.apk")
    entries = []
    for p in sorted(OUT.iterdir()):
        if p.is_file() and p.name != "SHA256SUMS.txt":
            entries.append(hashlib.sha256(p.read_bytes()).hexdigest() + "  " + p.name)
    (OUT / "SHA256SUMS.txt").write_text("\n".join(entries) + "\n", encoding="utf-8")
    print(OUT)

if __name__ == "__main__":
    main()
