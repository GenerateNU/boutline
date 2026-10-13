import { Section } from "@/components/primitives/section";

export default function TournamentIdPage() {
  return (
    <Section title="Tournament id details">
      <p>
        This is the tournament id details page where we list all the important
        info (dashboard).
      </p>
      <p>
        still waiting on lofis technically, but we could list the details here!
      </p>
      <br />
      <p>This page specifically is &apos; overview &apos; of the tournament.</p>
      <ul>
        <li>tournament name</li>
        <li>tournament location/venue</li>
        <li>tournament date</li>
        <li>tournament time</li>
        <li>tournament contact information</li>
        <li>ongoing live events</li>
      </ul>
      <p>
        if this tournament is private, then we ensure that the password is at
        least stored in their session to unlock it, if not then prompt them to
        enter the password/code
      </p>
    </Section>
  );
}
