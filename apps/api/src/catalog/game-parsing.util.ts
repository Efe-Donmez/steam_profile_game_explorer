export function extractReleaseYear(releaseDate: string | undefined): number | undefined {
  if (!releaseDate) return undefined;
  const match = releaseDate.match(/\d{4}/);
  return match ? parseInt(match[0], 10) : undefined;
}
