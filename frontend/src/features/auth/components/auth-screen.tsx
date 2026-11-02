interface AuthScreenProps {
  title: string;
  children: React.ReactNode;
}

function AuthScreen({ title, children }: AuthScreenProps) {
  return (
    <main className="mx-auto flex w-full max-w-mobile flex-1 flex-col items-center gap-16 px-10 pt-24 pb-10">
      <h1 className="text-4xl font-medium tracking-wide">BOUTLINE</h1>
      <div className="flex w-full flex-col gap-8">
        <h2 className="text-center text-xl">{title}</h2>
        {children}
      </div>
    </main>
  );
}

export { AuthScreen };
