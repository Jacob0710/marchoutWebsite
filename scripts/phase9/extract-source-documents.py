from __future__ import annotations

import hashlib
import json
import re
import unicodedata
import zipfile
from pathlib import Path
from xml.etree import ElementTree

import pdfplumber


ROOT = Path(__file__).resolve().parents[2]
SNAPSHOT = ROOT / "migration" / "phase9" / "source-snapshot.json"
ASSET_CACHE = ROOT / ".phase9-cache" / "wix" / "assets"
TEXT_CACHE = ROOT / ".phase9-cache" / "wix" / "document-text"
INDEX = ROOT / ".phase9-cache" / "wix-document-text-index.json"


def normalize(value: str) -> str:
    value = unicodedata.normalize("NFC", value).replace("\u200b", "").replace("\ufeff", "")
    value = re.sub(r"[\t ]+\n", "\n", value)
    value = re.sub(r"\n{3,}", "\n\n", value)
    return value.strip()


def extract_pdf(path: Path) -> tuple[str, int]:
    pages: list[str] = []
    with pdfplumber.open(path) as document:
        for page in document.pages:
            pages.append(page.extract_text(x_tolerance=2, y_tolerance=3, layout=False) or "")
        return normalize("\n\n".join(pages)), len(document.pages)


def extract_docx(path: Path) -> tuple[str, int]:
    with zipfile.ZipFile(path) as archive:
        root = ElementTree.fromstring(archive.read("word/document.xml"))
    namespace = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
    paragraphs: list[str] = []
    for paragraph in root.iter(f"{namespace}p"):
        text = "".join(node.text or "" for node in paragraph.iter(f"{namespace}t"))
        if text.strip():
            paragraphs.append(text)
    return normalize("\n".join(paragraphs)), 1


def main() -> None:
    snapshot = json.loads(SNAPSHOT.read_text(encoding="utf-8"))
    TEXT_CACHE.mkdir(parents=True, exist_ok=True)
    rows: list[dict[str, object]] = []
    for asset in snapshot["wix"]["assets"]:
        if not asset.get("safe") or asset.get("kind") != "attachment":
            continue
        cache_name = asset.get("cacheName")
        source = ASSET_CACHE / str(cache_name)
        row: dict[str, object] = {
            "sourceUrl": asset["sourceUrl"],
            "sourceSha256": asset["sha256"],
            "cacheName": cache_name,
            "detectedMimeType": asset["detectedMimeType"],
            "parents": asset["parents"],
            "labels": asset["labels"],
            "status": "pending",
        }
        try:
            mime = asset["detectedMimeType"]
            if mime == "application/pdf":
                text, page_count = extract_pdf(source)
            elif mime == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
                text, page_count = extract_docx(source)
            else:
                row.update(status="not-extracted", reason="unsupported_document_text_extractor")
                rows.append(row)
                continue
            text_hash = hashlib.sha256(text.encode("utf-8")).hexdigest()
            text_name = f"{asset['sha256']}.txt"
            (TEXT_CACHE / text_name).write_text(text + ("\n" if text else ""), encoding="utf-8")
            row.update(
                status="extracted",
                pageCount=page_count,
                textLength=len(text),
                textSha256=text_hash,
                textCacheName=text_name,
                preview=text[:500],
            )
        except Exception as error:  # evidence must retain extraction failures
            row.update(status="failed", reason=f"{type(error).__name__}: {error}")
        rows.append(row)
    rows.sort(key=lambda item: str(item["sourceUrl"]))
    INDEX.write_text(json.dumps({"snapshotSha256": snapshot["snapshotSha256"], "documents": rows}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    counts: dict[str, int] = {}
    for row in rows:
        counts[str(row["status"])] = counts.get(str(row["status"]), 0) + 1
    print(json.dumps({"documents": len(rows), "status": counts}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
