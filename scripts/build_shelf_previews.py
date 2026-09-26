"""Build lightweight WebP covers from the originals in public/shelf/.

Run after adding or replacing a cover: python scripts/build_shelf_previews.py
Requires Pillow; generated previews are committed so CI needs no image tooling.
"""

from pathlib import Path

from PIL import Image, ImageOps


SOURCE_DIR = Path(__file__).resolve().parents[1] / "public" / "shelf"
PREVIEW_DIR = SOURCE_DIR / "previews"
MAX_WIDTH = 960  # 450px home album card at ~2x pixel density


def main() -> None:
    PREVIEW_DIR.mkdir(exist_ok=True)
    total_before = total_after = updated = 0
    for source in sorted(SOURCE_DIR.iterdir()):
        if source.suffix.lower() not in {".jpg", ".png"}:
            continue
        target = PREVIEW_DIR / f"{source.stem}.webp"
        total_before += source.stat().st_size
        if not target.exists() or target.stat().st_mtime < source.stat().st_mtime:
            with Image.open(source) as original:
                image = ImageOps.exif_transpose(original)
                if image.width > MAX_WIDTH:
                    image.thumbnail((MAX_WIDTH, image.height), Image.Resampling.LANCZOS)
                if image.mode not in {"RGB", "RGBA"}:
                    image = image.convert("RGBA" if "A" in image.getbands() else "RGB")
                image.save(target, "WEBP", quality=88, method=6, icc_profile=original.info.get("icc_profile", b""))
                with Image.open(target) as preview:
                    assert preview.size == image.size, source.name
            updated += 1
        total_after += target.stat().st_size
    print(f"Updated {updated} previews; {total_before / 1048576:.1f} MiB originals -> {total_after / 1048576:.1f} MiB previews")


if __name__ == "__main__":
    main()
