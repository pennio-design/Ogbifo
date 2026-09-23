"""Word and letter error scoring between a reference line and a hypothesis line."""

from collections import Counter
from dataclasses import dataclass, field

from .text import letters, strip_marks, tokenize

# Error categories for a substituted word, from least to most severe.
TONE = "tone"  # same letters and underdots, wrong tone marks
UNDERDOT = "underdot"  # same base letters, wrong underdots (tones may also be wrong)
SPELLING = "spelling"  # different base letters: the word itself changed


def align(ref, hyp):
    """Levenshtein alignment of two token lists.

    Returns a list of (op, ref_token, hyp_token) with op in
    "eq", "sub", "del" (missing from hyp) and "ins" (extra in hyp).
    """
    n, m = len(ref), len(hyp)
    dist = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(n + 1):
        dist[i][0] = i
    for j in range(m + 1):
        dist[0][j] = j
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            cost = 0 if ref[i - 1] == hyp[j - 1] else 1
            dist[i][j] = min(
                dist[i - 1][j - 1] + cost,
                dist[i - 1][j] + 1,
                dist[i][j - 1] + 1,
            )
    ops = []
    i, j = n, m
    while i > 0 or j > 0:
        if i > 0 and j > 0 and dist[i][j] == dist[i - 1][j - 1] + (ref[i - 1] != hyp[j - 1]):
            ops.append(("eq" if ref[i - 1] == hyp[j - 1] else "sub", ref[i - 1], hyp[j - 1]))
            i, j = i - 1, j - 1
        elif i > 0 and dist[i][j] == dist[i - 1][j] + 1:
            ops.append(("del", ref[i - 1], None))
            i -= 1
        else:
            ops.append(("ins", None, hyp[j - 1]))
            j -= 1
    ops.reverse()
    return ops


def classify(ref_word, hyp_word):
    if strip_marks(ref_word, keep_underdots=True) == strip_marks(hyp_word, keep_underdots=True):
        return TONE
    if strip_marks(ref_word) == strip_marks(hyp_word):
        return UNDERDOT
    return SPELLING


@dataclass
class Score:
    """Error counts for one or more lines. Scores add together with +."""

    ref_words: int = 0
    substitutions: int = 0
    deletions: int = 0
    insertions: int = 0
    categories: Counter = field(default_factory=Counter)
    letters_total: int = 0
    letters_wrong: int = 0
    confusions: Counter = field(default_factory=Counter)

    @property
    def errors(self):
        return self.substitutions + self.deletions + self.insertions

    @property
    def wer(self):
        return self.errors / self.ref_words if self.ref_words else 0.0

    @property
    def letter_error_rate(self):
        return self.letters_wrong / self.letters_total if self.letters_total else 0.0

    def __add__(self, other):
        return Score(
            self.ref_words + other.ref_words,
            self.substitutions + other.substitutions,
            self.deletions + other.deletions,
            self.insertions + other.insertions,
            self.categories + other.categories,
            self.letters_total + other.letters_total,
            self.letters_wrong + other.letters_wrong,
            self.confusions + other.confusions,
        )


def score_line(reference, hypothesis, casefold=True):
    """Score hypothesis against reference.

    Word error rate counts every word that is not exactly right. The letter
    error rate only looks at words whose base letters match (so the model kept
    the word and only its marks can be wrong) and counts letters with the
    wrong set of marks.
    """
    ref = tokenize(reference, casefold)
    hyp = tokenize(hypothesis, casefold)
    score = Score(ref_words=len(ref))
    for op, r, h in align(ref, hyp):
        if op == "del":
            score.deletions += 1
        elif op == "ins":
            score.insertions += 1
        elif op in ("eq", "sub") and strip_marks(r) == strip_marks(h):
            ref_letters, hyp_letters = letters(r), letters(h)
            score.letters_total += len(ref_letters)
            score.letters_wrong += sum(a != b for a, b in zip(ref_letters, hyp_letters))
        if op == "sub":
            score.substitutions += 1
            score.categories[classify(r, h)] += 1
            score.confusions[(r, h)] += 1
    return score


def total(scores):
    result = Score()
    for s in scores:
        result = result + s
    return result
