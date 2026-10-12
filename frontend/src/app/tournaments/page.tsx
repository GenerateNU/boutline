import { Section } from "@/components/primitives/section";
import Link from "next/link";

export default function TournamentsPage() {
  return (
    <div className="mx-auto flex w-full max-w-mobile flex-col gap-10 px-4 py-10">
      <Section title="Tournament Page" className="flex flex-col gap-4">
        <p>This is the tournament page.</p>
        <p>lists of tournaments</p>
        <p>also have a space to enter in a &apos;private code&apos;</p>
        <p>also they should be able to login/register here via navbar</p>
        <p>
          they should also be able to search / filter for tournaments here.
          There will be a calendar / weekly view that displays past, present,
          and future tournaments
        </p>
      </Section>

      <Section title="quick link" className="flex flex-col gap-4">
        <ul className="flex flex-col gap-2">
          <li>
            <Link href="/tournaments/2" className="text-primary underline">
              some random id
            </Link>
          </li>
        </ul>
      </Section>
    </div>
  );
}
