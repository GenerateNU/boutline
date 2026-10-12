import { Section } from "@/components/primitives/section";

export default function TournamentIdPage() {
    return (
        <div className="mx-auto flex w-full max-w-mobile flex-col gap-10 px-4 py-10">
            <Section title="Tournament id details">
                <p>This is the tournament id details page where we list all the important info (dashboard).</p>
                <p>still waiting on lofis technically, but we could list the details here!</p>
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
            </Section>

        </div>
    );
}