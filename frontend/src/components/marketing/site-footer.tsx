import { Link } from "react-router-dom";

export function SiteFooter() {
  return (
    <footer className="border-t border-border py-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 text-sm text-muted-foreground sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <p className="font-heading font-semibold text-foreground">Penny — Trợ lý chi tiêu thông minh</p>
          <p className="text-xs leading-relaxed">
            Sản phẩm của <span className="font-medium">Công ty Cổ phần Giải Trí và Truyền Thông Việt Nam - NewZealand</span>
            <br />
            MSDN: 0316475095 · Trụ sở: Số 25, Đường 17B, Phường An Lạc, TP. Hồ Chí Minh
            <br />
            Email: support@pennybot.vn · ĐT: 0974 287 428
          </p>
        </div>
        <div className="flex shrink-0 gap-4">
          <Link to="/privacy" className="hover:text-foreground hover:underline">Quyền riêng tư</Link>
          <Link to="/terms" className="hover:text-foreground hover:underline">Điều khoản</Link>
          <Link to="/contact" className="hover:text-foreground hover:underline">Liên hệ</Link>
        </div>
      </div>
    </footer>
  );
}
