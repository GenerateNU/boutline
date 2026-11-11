import Image from "next/image";

interface AuthScreenProps {
  title: string;
  children: React.ReactNode;
}

function AuthScreen({ title, children }: AuthScreenProps) {
  return (
    <main className="relative isolate mx-auto flex w-full max-w-mobile flex-1 flex-col items-center justify-center gap-5 overflow-hidden px-5 py-10 font-manrope">
      <Image
        src="/brand/auth-pattern.svg"
        alt=""
        width={646}
        height={994}
        className="pointer-events-none absolute top-[58%] left-[44%] -z-10 max-w-none -translate-1/2 rotate-140"
      />
      <Image src="/brand/logo.svg" alt="" width={127} height={148} />
      <p className="font-wordmark text-5xl leading-14 tracking-[-0.96px] text-blue">
        BOUTLINE
      </p>
      <div className="flex w-full max-w-65 flex-col items-center gap-8">
        <h1 className="text-xl font-semibold text-obsidian">{title}</h1>
        {children}
      </div>
    </main>
  );
}

export { AuthScreen };
