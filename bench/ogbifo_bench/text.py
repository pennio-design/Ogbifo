"""Unicode handling for tone-marked Yorùbá.

Every comparison in the harness goes through these functions, so that a word
typed with precomposed characters (é) and one typed with combining marks
(e + U+0301) count as the same word.
"""

import unicodedata

DOT_BELOW = "\u0323"
APOSTROPHES = {"’": "'", "‘": "'", "ʼ": "'", "`": "'"}


def nfc(text):
    return unicodedata.normalize("NFC", text)


def _is_mark(ch):
    return unicodedata.category(ch) == "Mn"


def strip_marks(text, keep_underdots=False):
    """Remove tone marks (and underdots unless keep_underdots) from text.

    With keep_underdots=False this produces the plain input the tone-restoration
    model expects: "ọkọ́" -> "oko". With keep_underdots=True only tones go:
    "ọkọ́" -> "ọkọ".
    """
    kept = [
        ch
        for ch in unicodedata.normalize("NFD", text)
        if not _is_mark(ch) or (keep_underdots and ch == DOT_BELOW)
    ]
    return nfc("".join(kept))


def _is_edge_punct(ch):
    return unicodedata.category(ch)[0] in "PS" and ch != "'"


def tokenize(text, casefold=True):
    """Split a line into comparable words.

    Punctuation at word edges is dropped; apostrophes inside words (elision,
    e.g. l'ọ́jọ́) are kept and normalised to a plain apostrophe.
    """
    text = nfc(text)
    for curly, plain in APOSTROPHES.items():
        text = text.replace(curly, plain)
    if casefold:
        text = nfc(text.casefold())
    tokens = []
    for raw in text.split():
        start, end = 0, len(raw)
        while start < end and (_is_edge_punct(raw[start]) or raw[start] == "'"):
            start += 1
        while end > start and (_is_edge_punct(raw[end - 1]) or raw[end - 1] == "'"):
            end -= 1
        if start < end:
            tokens.append(raw[start:end])
    return tokens


def letters(word):
    """Decompose a word into (base letter, marks) pairs.

    "ọ́" -> [("o", frozenset({U+0323, U+0301}))]. Used for per-letter scoring.
    """
    groups = []
    for ch in unicodedata.normalize("NFD", word):
        if _is_mark(ch) and groups:
            base, marks = groups[-1]
            groups[-1] = (base, marks | {ch})
        else:
            groups.append((ch, frozenset()))
    return groups
