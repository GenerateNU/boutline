import Link from "next/link";

import { Button } from "@/components/primitives/button";

interface PaginationProps {
  total: number;
  limit: number;
  offset: number;
  basePath: string;
  search?: string;
}

interface StepProps {
  href: string | null; 
  rel: "prev" | "next";
  children: React.ReactNode;
}

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
  if (total === 0) {
    return null;
  }

  function href(to: number) {
    const params = new URLSearchParams();
    if (search) {
      params.set("q", search);
    }
    if (to > 0) {
      params.set("offset", String(to));
    }
    return params.size ? `${basePath}?${params}` : basePath;
  }

  // offset comes from the URL, so it need not be a multiple of limit and may
  // sit past the end entirely. Snapping to the last page keeps the range and
  // both links inside the result set.
  const start = Math.min(offset, Math.floor((total - 1) / limit) * limit);
  const previous = Math.max(start - limit, 0);
  const next = start + limit;

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-between gap-4"
    >
      <Step href={start > 0 ? href(previous) : null} rel="prev">
        Previous
      </Step>

      <span className="text-xs text-muted-foreground">
        {start + 1}–{Math.min(next, total)} of {total}
      </span>

      <Step href={next < total ? href(next) : null} rel="next">
        Next
      </Step>
    </nav>
  );
}

export { Pagination };
