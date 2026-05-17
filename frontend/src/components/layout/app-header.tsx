import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import pennyAvatar from "@/assets/logo.png";

export function AppHeader() {
  const { user } = useAuth();

  const displayName = user?.name || "Bạn";

  return (
    <header className="flex items-center justify-between rounded-b-3xl bg-secondary/60 px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-5 sm:px-6">
      <div>
        <p className="font-heading text-sm italic text-muted-foreground sm:text-base">
          Penny Xin Chào,
        </p>
        <h1 className="font-heading text-xl font-bold tracking-tight sm:text-2xl">
          {displayName}
        </h1>
      </div>
      <Avatar className="size-11 border-2 border-primary/20 shadow-sm sm:size-12">
        <AvatarImage src={pennyAvatar} alt="Penny" />
        <AvatarFallback className="bg-primary/10 text-primary font-bold">
          P
        </AvatarFallback>
      </Avatar>
    </header>
  );
}
