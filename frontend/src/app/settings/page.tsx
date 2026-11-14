import GroupOutlined from "@mui/icons-material/GroupOutlined";
import LanguageOutlined from "@mui/icons-material/LanguageOutlined";

const GROUPS = [
  [
    { label: "Profile", Icon: LanguageOutlined },
    { label: "Accessibility", Icon: GroupOutlined },
    { label: "Language", Icon: LanguageOutlined },
  ],
  [
    { label: "Privacy Policy", Icon: LanguageOutlined },
    { label: "Help", Icon: LanguageOutlined },
  ],
];

export default function SettingsPage() {
  return (
    <main className="mx-auto flex w-full max-w-mobile flex-1 flex-col gap-5 px-6 pt-5 pb-4 font-manrope">
      <h1 className="pb-1.25 text-xl font-semibold text-obsidian">Settings</h1>
      {GROUPS.map((group) => (
        <ul
          key={group[0].label}
          className="flex flex-col rounded-[12px] border border-outline bg-background p-1 shadow-sm"
        >
          {group.map(({ label, Icon }) => (
            <li key={label} className="flex items-center gap-3 px-4 py-3 text-sm text-obsidian">
              <Icon aria-hidden className="size-6" />
              {label}
            </li>
          ))}
        </ul>
      ))}
    </main>
  );
}
