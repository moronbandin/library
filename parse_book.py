import re
from convert_to_json import convert_to_json


def parse_text_file(filepath, book_id):
    chapters = {}
    current_chapter = None

    chapter_pattern = re.compile(r"^\s*(\d+)\s*$")
    verse_pattern = re.compile(r"^\s*(\d+)\s+(.*)")

    with open(filepath, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()

            if not line:
                continue

            # Detectar capítulo (liña só con número)
            chapter_match = chapter_pattern.match(line)
            if chapter_match:
                current_chapter = chapter_match.group(1)
                chapters[current_chapter] = {}
                continue

            # Detectar versículo
            verse_match = verse_pattern.match(line)
            if verse_match and current_chapter is not None:
                verse_num = verse_match.group(1)
                verse_text = verse_match.group(2).strip()
                chapters[current_chapter][verse_num] = verse_text

    return {
        "book": book_id,
        "chapters": chapters
    }


def main():
    print("\n--- Parser libro completo NT → JSON por capítulo ---\n")

    book_id = input("ID do libro (ex: mt, mc, rom): ").strip().lower()

    filepath = "text.txt"

    book_data = parse_text_file(filepath, book_id)

    convert_to_json(book_data)


if __name__ == "__main__":
    main()
