export function tableauRoundName(size: number): { name: string; boutName: string } {
  switch (size) {
    case 2:
      return { name: "Finals", boutName: "Final" };
    case 4:
      return { name: "Semi-finals", boutName: "Semi-final" };
    case 8:
      return { name: "Quarter-finals", boutName: "Quarter-final" };
    default:
      return { name: `Table of ${size}`, boutName: `Table of ${size}` };
  }
}
