export function DashboardHeader({ title = '展会概况总览' }: { title?: string }) {
  const cleanTitle = title.trim();
  const wrappedTitle = cleanTitle.match(/.{1,17}/g)?.join('\n') ?? cleanTitle;

  return (
    <header className="w-full">
      <div className="flex h-[85px] w-full items-center justify-center bg-[url('/img/top-menu.png')] bg-[length:100%_100%] bg-top bg-no-repeat">
        <div
          className="w-full whitespace-pre-line px-[clamp(18px,1.6vw,28px)] text-center text-[36px] leading-[0.7366] text-white font-[PangMenZhengDao] font-normal not-italic"
          style={{ textShadow: "0 6px 16px rgba(0,0,0,0.08), 0 3px 6px rgba(0,0,0,0.12), 0 9px 28px rgba(0,0,0,0.05)" }}
        >
          {wrappedTitle}
        </div>
      </div>
    </header>
  );
}
