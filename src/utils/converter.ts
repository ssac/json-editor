export const toNum = (cell: string): number => {
  const parsed = Number(cell);

  if (isNaN(parsed)) {
    throw new Error(`Passing value is not a number like: ${cell}`);
  }

  if (parsed === Infinity || parsed === -Infinity) {
    throw new Error(`Passing value is Infinity or negative Infinity: ${cell}`);
  }

  return parsed;
};
