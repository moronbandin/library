from cltk import NLP

print("Cargando modelo...")
nlp = NLP(language="grc")
print("Modelo listo.")

text = "Τοῦ δὲ Ἰησοῦ γεννηθέντος ἐν Βηθλεέμ"

doc = nlp.analyze(text)

print("Analizando...\n")

for word in doc.words:
    print(word.string, "|", word.lemma, "|", word.pos)
