import json
import os


def convert_to_json(book_data, base_dir="data"):
    """
    Recibe:
    {
        "book": "mt",
        "chapters": {
            "1": {"1": "...", "2": "..."},
            ...
        }
    }

    E crea:
    data/mt/01.json
    data/mt/02.json
    ...
    """

    book_id = book_data["book"].lower()
    chapters = book_data["chapters"]

    for chapter_num, verses in chapters.items():
        chapter_padded = str(int(chapter_num)).zfill(2)

        filepath = os.path.join(base_dir, book_id, f"{chapter_padded}.json")

        # Converter estrutura a formato do visor
        output_data = []
        for verse_num, verse_text in verses.items():
            output_data.append({
                "v": int(verse_num),
                "text": verse_text
            })

        # Crear directorio se non existe
        os.makedirs(os.path.dirname(filepath), exist_ok=True)

        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(output_data, f, ensure_ascii=False, indent=2)

        print(f"✔ Gardado {filepath}")

    print("\nProceso completado.\n")
