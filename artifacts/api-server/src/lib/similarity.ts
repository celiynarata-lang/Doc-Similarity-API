// Shared shingling similarity utilities

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 0);
}

export function makeShingles(words: string[], k = 6): Set<string> {
  const shingles = new Set<string>();
  for (let i = 0; i <= words.length - k; i++) {
    shingles.add(words.slice(i, i + k).join(" "));
  }
  return shingles;
}

export function computeContainment(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 || setB.size === 0) return 0;
  let shared = 0;
  for (const s of setA) {
    if (setB.has(s)) shared++;
  }
  return (shared / Math.min(setA.size, setB.size)) * 100;
}

export function computeLocalOverlap(
  newWords: string[],
  newShingles: Set<string>,
  matchedShingleSets: Set<string>[],
): number {
  if (newWords.length === 0 || matchedShingleSets.length === 0) return 0;

  const matchedShingles = new Set<string>();
  for (const stored of matchedShingleSets) {
    for (const s of newShingles) {
      if (stored.has(s)) matchedShingles.add(s);
    }
  }

  if (matchedShingles.size === 0) return 0;

  const matchedWords = new Set<string>();
  for (const shingle of matchedShingles) {
    for (const word of shingle.split(" ")) {
      matchedWords.add(word);
    }
  }

  let matchedWordCount = 0;
  for (const word of newWords) {
    if (matchedWords.has(word)) matchedWordCount++;
  }

  return Math.round((matchedWordCount / newWords.length) * 100);
}

export interface LocalMatch {
  documentId: string;
  title: string;
  containment: number;
  sharedCount: number;
}

export function compareAgainstStored(
  content: string,
  storedDocs: Array<{ id: string; title: string; content: string }>,
): {
  newWords: string[];
  newShingles: Set<string>;
  localMatches: LocalMatch[];
  matchedShingleSets: Set<string>[];
} {
  const newWords = tokenize(content);
  const newShingles = makeShingles(newWords);
  const localMatches: LocalMatch[] = [];
  const matchedShingleSets: Set<string>[] = [];

  for (const doc of storedDocs) {
    const docWords = tokenize(doc.content);
    const docShingles = makeShingles(docWords);
    const containment = computeContainment(newShingles, docShingles);

    let shared = 0;
    for (const s of newShingles) {
      if (docShingles.has(s)) shared++;
    }

    if (containment > 0) {
      localMatches.push({
        documentId: doc.id,
        title: doc.title,
        containment: Math.round(containment),
        sharedCount: shared,
      });
      matchedShingleSets.push(docShingles);
    }
  }

  localMatches.sort((a, b) => b.containment - a.containment);

  return { newWords, newShingles, localMatches, matchedShingleSets };
}

export function countSentences(text: string): number {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0).length;
}
