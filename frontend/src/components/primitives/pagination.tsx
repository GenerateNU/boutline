import Link from "next/link";

import { Button } from "@/components/primitives/button";

type PaginationProps = {
  total: number;
  limit: number;
  offset: number;
  basePath: string;
  search?: string;
};

type StepProps = {
  href: string | null; 
  rel: "prev" | "next";
  children: React.ReactNode;
};

function Step({ href, rel, children }: StepProps) {
  return (
    <Button
      asChild={href !== null}
      variant="outline"
      className="rounded-full"
      disabled={href === null}
    >
      {href === null ? (
        children
      ) : (
        <Link href={href} rel={rel}>
          {children}
        </Link>
      )}
    </Button>
  );
}

function Pagination({
  total,
  limit,
  offset,
  basePath,
  search,
}: PaginationProps) {
  if (total === 0) return null;

  function href(to: number) {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (to > 0) params.set("offset", String(to));
    return params.size ? `${basePath}?${params}` : basePath;
  }

  const previous = offset - limit;
  const next = offset + limit;

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-between gap-4"
    >
      <Step href={previous >= 0 ? href(previous) : null} rel="prev">
        Previous
      </Step>

      <span className="text-xs text-muted-foreground">
        {offset + 1}–{Math.min(next, total)} of {total}
      </span>

      <Step href={next < total ? href(next) : null} rel="next">
        Next
      </Step>
    </nav>
  );
}

export { Pagination };
