"""Merge cover.pdf + body.pdf into final OvinFormulation Commercial Vision PDF.
Normalizes the cover page size to match body A4 dimensions exactly.
"""
import sys
from pypdf import PdfReader, PdfWriter
from pypdf.generic import RectangleObject

def merge(cover_path: str, body_path: str, output_path: str):
    writer = PdfWriter()

    cover = PdfReader(cover_path)
    body = PdfReader(body_path)

    # Use the body's first page size as the canonical A4
    body_w = float(body.pages[0].mediabox.width)
    body_h = float(body.pages[0].mediabox.height)
    print(f"Canonical A4: {body_w} x {body_h} pt")

    for page in cover.pages:
        # Force the cover MediaBox to match the body's A4 size
        page.mediabox = RectangleObject((0, 0, body_w, body_h))
        page.cropbox = RectangleObject((0, 0, body_w, body_h))
        writer.add_page(page)

    for page in body.pages:
        writer.add_page(page)

    writer.add_metadata({
        "/Title": "OvinFormulation Commercial Vision v1.0",
        "/Author": "Abdelkader Atia — AgriSkills Academy",
        "/Subject": "5-year monetization roadmap across Student, Farmer, and Feed Mill tiers",
        "/Creator": "Z.ai PDF skill (ReportLab + Playwright)",
        "/Producer": "pypdf",
        "/Keywords": "OvinFormulation, sheep nutrition, SaaS, monetization, Maghreb, France, AR FR EN",
    })

    with open(output_path, "wb") as f:
        writer.write(f)

    import os
    sz = os.path.getsize(output_path)
    print(f"✓ Merged PDF: {output_path}")
    print(f"  Size: {sz / 1024:.1f} KB")
    print(f"  Pages: {len(cover.pages) + len(body.pages)}")

if __name__ == "__main__":
    merge(
        "/home/z/my-project/scripts/cover.pdf",
        "/home/z/my-project/scripts/body.pdf",
        "/home/z/my-project/download/OvinFormulation_Commercial_Vision_v1.0.pdf",
    )
