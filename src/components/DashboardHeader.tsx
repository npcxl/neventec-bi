export function DashboardHeader({ title = '展会概况总览' }: { title?: string }) {
  const cleanTitle = title.trim();
  const wrappedTitle = cleanTitle.match(/.{1,17}/g)?.join('\n') ?? cleanTitle;

  return (
    <header className="w-full">
      <div className="flex h-[clamp(72px,7vw,126px)] w-full items-center justify-center bg-[url('/img/toubiao@2x.png')] bg-[length:100%_100%] bg-top bg-no-repeat font-[PangMenZhengDao] text-white drop-shadow-[0_0_18px_rgba(112,187,255,0.42)]">
        <div className="w-full whitespace-pre-line px-[clamp(18px,1.6vw,28px)] text-center text-[clamp(28px,1.2vw,28px)] leading-[1.05] tracking-[0.02em]">
          {wrappedTitle}
        </div>
      </div>
    </header>
  );
}
