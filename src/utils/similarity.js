export function normalize(text) {
  return text
    .toLowerCase()
    .replace(/[.,!?'"’]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function similarity(target, spoken) {
  const targetWords = normalize(target).split(" ").filter(Boolean);
  const spokenWords = normalize(spoken).split(" ").filter(Boolean);

  if (targetWords.length === 0) return 0;

  let matchCount = 0;
  const usedIndexes = new Set();

  targetWords.forEach((targetWord) => {
    const foundIndex = spokenWords.findIndex(
      (spokenWord, index) =>
        spokenWord === targetWord && !usedIndexes.has(index)
    );

    if (foundIndex !== -1) {
      matchCount += 1;
      usedIndexes.add(foundIndex);
    }
  });

  return Math.round((matchCount / targetWords.length) * 100);
}

export function getSequentialMatchCount(targetText, spokenText) {
  const targetWords = normalize(targetText).split(" ").filter(Boolean);
  const spokenWords = normalize(spokenText).split(" ").filter(Boolean);

  let matchCount = 0;

  for (let i = 0; i < targetWords.length; i++) {
    if (targetWords[i] === spokenWords[i]) {
      matchCount += 1;
    } else {
      break;
    }
  }

  return matchCount;
}