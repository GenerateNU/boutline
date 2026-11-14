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
  children,
  ...props
}: NavbarProps) {
  return (
    <header
      data-slot="navbar"
      className={cn("relative flex h-10 items-center overflow-hidden bg-obsidian lg:h-17", className)}
      {...props}
    >
      <Image
        src="/brand/nav-plate.svg"
        alt=""
        width={297}
        height={57}
        className="absolute top-1/2 left-0 -translate-y-1/2 lg:h-20 lg:w-96"
      />
      <Image
        src="/brand/nav-blade.svg"
        alt=""
        width={28}
        height={55}
        className="absolute top-1/2 left-69.75 -translate-y-1/2 lg:left-90 lg:h-19.25 lg:w-9.25"
      />
      {wrapMenuButton(
        <Button
          ref={menuRef}
          type="button"
          variant="text"
          size="icon"
          aria-label="Open menu"
          onClick={onMenuClick}
          className="relative ml-2.5 text-white hover:bg-background/10 lg:ml-4 [&_svg]:size-6"
        >
          <MenuOutlined aria-hidden />
        </Button>,
      )}
      <Link href="/" className="relative ml-2.5 flex items-center gap-2.5 lg:ml-4 lg:gap-3">
        <Image
          src="/brand/logo-mark.svg"
          alt=""
          width={21}
          height={24}
          className="lg:h-7.75 lg:w-6.75"
        />
        <span className="font-wordmark text-[17px] tracking-[1.02px] text-white lg:text-2xl lg:tracking-[1.44px]">
          BOUTLINE
        </span>
      </Link>
      {children}
    </header>
  );
}

export { Navbar };
