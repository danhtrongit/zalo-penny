import { useAuth } from "@/hooks/use-auth";
import pennyLogo from "@/assets/logo.png";

export function AppHeader() {
  const { user } = useAuth();

  const displayName = user?.name || "Bạn";

  return (
    <header
      className="rounded-b-[40px] px-6 pt-[max(2rem,env(safe-area-inset-top))] pb-20"
      style={{ background: "#daeedc" }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-normal text-[#588e7a] sm:text-base">
            Penny Xin Chào,
          </p>
          <h1 className="font-heading text-3xl font-black leading-tight tracking-tight text-[#11684c] sm:text-4xl">
            {displayName}
          </h1>
        </div>
        <div className="flex size-13 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
          <img src={pennyLogo} alt="Penny" className="size-11 object-contain" />
        </div>
      </div>
    </header>
  );
}
