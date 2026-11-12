import { cn } from "cn";
import MenuOutlined from "@mui/icons-material/MenuOutlined";
import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/primitives/button";

interface NavbarProps extends React.ComponentProps<"header"> {
  onMenuClick?: () => void;
  menuRef?: React.Ref<HTMLButtonElement>;
  wrapMenuButton?: (button: React.ReactElement) => React.ReactNode;
}

function Navbar({
  onMenuClick,
  menuRef,
  wrapMenuButton = (button) => button,
  className,
  ...props
}: NavbarProps) {
  return (
    <header
      data-slot="navbar"
      className={cn("relative flex h-10 items-center overflow-hidden bg-obsidian", className)}
      {...props}
    >
      <Image
        src="/brand/nav-plate.svg"
        alt=""
        width={297}
        height={57}
        className="absolute top-1/2 left-0 -translate-y-1/2"
      />
      <Image
        src="/brand/nav-blade.svg"
        alt=""
        width={28}
        height={55}
        className="absolute top-1/2 left-69.75 -translate-y-1/2"
      />
      {wrapMenuButton(
        <Button
          ref={menuRef}
          type="button"
          variant="text"
          size="icon"
          aria-label="Open menu"
          onClick={onMenuClick}
          className="relative ml-2.5 text-white hover:bg-background/10 [&_svg]:size-6"
        >
          <MenuOutlined aria-hidden />
        </Button>,
      )}
      <Link href="/" className="relative ml-2.5 flex items-center gap-2.5">
        <Image src="/brand/logo-mark.svg" alt="" width={21} height={24} />
        <span className="font-wordmark text-[17px] tracking-[1.02px] text-white">BOUTLINE</span>
      </Link>
    </header>
  );
}

export { Navbar };
