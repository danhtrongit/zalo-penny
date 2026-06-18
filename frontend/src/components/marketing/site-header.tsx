import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LayoutDashboard } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export function SiteHeader() {
  const { user } = useAuth();
  return (
    <nav className="border-b border-border">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link to="/" className="font-heading text-2xl font-bold tracking-tight">
          Penny
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          {user ? (
            <Link to="/dashboard">
              <Button>
                <LayoutDashboard className="mr-1.5 size-4" />
                Vào Dashboard
              </Button>
            </Link>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost">Đăng nhập</Button>
              </Link>
              <Link to="/register">
                <Button>Dùng miễn phí</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
