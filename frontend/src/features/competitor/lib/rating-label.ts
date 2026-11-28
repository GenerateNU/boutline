export function ratingLabel(rating: string, ratingYear: number | null | undefined): string {
  return ratingYear == null ? rating : `${rating}${String(ratingYear).padStart(2, "0")}`;
}
