import Link from "next/link";
import { Section } from "@/components/primitives/section";

export default function FencersTab() {
  return (
    <>
      <Section title="Fencers Tab" className="flex flex-col gap-4">
        <p>This is the fencers tab.</p>
        <p>lists of fencers</p>
        <p>also have a space to enter in a &apos;private code&apos;</p>
        <p>also they should be able to login/register here via navbar</p>
        <p>
          they should also be able to search / filter for fencers here. There
          will be a calendar / weekly view that displays past, present, and
          future fencers
        </p>
      </Section>

      <Section title="quick link" className="flex flex-col gap-4">
        <ul className="flex flex-col gap-2">
          <li>
            <Link
              href="/tournaments/2/fencers"
              className="text-primary underline"
            >
              some random id
            </Link>
          </li>
        </ul>
      </Section>
    </>
  );
}
