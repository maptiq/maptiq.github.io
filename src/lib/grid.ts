// Picks the column count (preferring the first option) that never leaves a
// lone card on the last row.
function pick(count: number, options: number[]): number {
  return (
    options.find((cols) => count % cols === 0) ??
    options.find((cols) => count % cols !== 1) ??
    options[0]
  );
}

export function gridColumns(count: number): string {
  const lg = count <= 5 ? count : pick(count, [4, 3]);
  const md = count <= 2 ? count : pick(count, [3, 2]);
  return `--cols-lg:${lg};--cols-md:${md}`;
}
