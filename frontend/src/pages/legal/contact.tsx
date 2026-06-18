import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, MessageSquare, MapPin, Phone, Building2, FileBadge, Globe } from "lucide-react";
import { PageHead } from "@/components/page-head";

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <PageHead title="Liên hệ" description="Liên hệ hỗ trợ Penny: email support@pennybot.vn, hotline 0974 287 428." canonical="/contact" />
      <Link to="/">
        <Button variant="ghost" className="mb-8">← Trang chủ</Button>
      </Link>

      <div className="mb-8 space-y-2">
        <h1 className="font-heading text-3xl font-bold">Liên hệ</h1>
        <p className="text-sm text-muted-foreground">
          <strong>Penny</strong> là sản phẩm trợ lý chi tiêu AI trên Zalo,
          được phát triển và vận hành bởi{" "}
          <strong>Công ty Cổ phần Giải Trí và Truyền Thông Việt Nam - NewZealand</strong>.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <Mail className="size-7 text-primary" />
            <CardTitle className="text-base">Email hỗ trợ</CardTitle>
          </CardHeader>
          <CardContent>
            <a
              href="mailto:support@pennybot.vn"
              className="text-sm text-muted-foreground hover:text-primary hover:underline"
            >
              support@pennybot.vn
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <Phone className="size-7 text-primary" />
            <CardTitle className="text-base">Điện thoại</CardTitle>
          </CardHeader>
          <CardContent>
            <a
              href="tel:0974287428"
              className="text-sm text-muted-foreground hover:text-primary hover:underline"
            >
              0974 287 428
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <MessageSquare className="size-7 text-primary" />
            <CardTitle className="text-base">Zalo</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Nhắn tin cho Penny qua bot Zalo sau khi kết nối
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="size-5 text-primary" />
            <CardTitle className="text-lg">Đơn vị chủ quản</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="space-y-1">
            <p className="font-semibold uppercase">
              Công ty Cổ phần Giải Trí và Truyền Thông Việt Nam - NewZealand
            </p>
            <p className="text-xs italic text-muted-foreground">
              Vietnam – New Zealand Communication and Entertainment Joint Stock
              Company
            </p>
          </div>

          <dl className="grid gap-2 sm:grid-cols-[auto_1fr] sm:gap-x-6">
            <dt className="flex items-center gap-1.5 text-muted-foreground">
              <FileBadge className="size-3.5" /> Mã số doanh nghiệp
            </dt>
            <dd className="font-mono">0316475095</dd>

            <dt className="flex items-center gap-1.5 text-muted-foreground">
              <FileBadge className="size-3.5" /> Ngày cấp
            </dt>
            <dd>09/09/2020</dd>

            <dt className="flex items-center gap-1.5 text-muted-foreground">
              <FileBadge className="size-3.5" /> Cơ quan quản lý
            </dt>
            <dd>Chi cục Thuế Khu vực 9, TP. Hồ Chí Minh</dd>

            <dt className="flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="size-3.5" /> Trụ sở chính
            </dt>
            <dd>
              Số 25, Đường 17B, Phường An Lạc,
              <br />
              TP. Hồ Chí Minh, Việt Nam
            </dd>

            <dt className="flex items-center gap-1.5 text-muted-foreground">
              <Building2 className="size-3.5" /> Người đại diện pháp luật
            </dt>
            <dd>Ông Nguyễn Hữu Luân</dd>

            <dt className="flex items-center gap-1.5 text-muted-foreground">
              <Globe className="size-3.5" /> Lĩnh vực hoạt động
            </dt>
            <dd>
              Sản xuất chương trình truyền hình, dịch vụ phần mềm và nội dung
              số. <strong>Penny</strong> là sản phẩm trợ lý chi tiêu AI thuộc
              danh mục dịch vụ phần mềm của công ty.
            </dd>
          </dl>

          <p className="border-t pt-3 text-xs text-muted-foreground">
            Mọi thắc mắc về dịch vụ <strong>Penny</strong> (pennybot.vn) vui
            lòng liên hệ qua email hoặc số điện thoại ở trên.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
