import { PageHead } from "@/components/page-head";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { MessageCircle, Mail, Phone, ExternalLink, Shield, FileText, HelpCircle } from "lucide-react";
import pennyLogo from "@/assets/logo.png";

const faqs = [
  { q: "Làm sao để bắt đầu ghi chi tiêu?", a: "Nhắn tin cho Penny trên Zalo, ví dụ: \"ăn trưa 50k\" - Penny sẽ tự hiểu và ghi lại cho bạn." },
  { q: "Làm sao để đặt ngân sách?", a: "Nhắn \"/limit\" hoặc vào Cài Đặt > Ngân sách tháng để đặt hạn mức chi tiêu." },
  { q: "Penny có đọc được hóa đơn không?", a: "Có! Gửi ảnh hóa đơn cho Penny trên Zalo, Penny sẽ tự đọc và lưu lại các khoản chi." },
  { q: "Làm sao để đổi cách Penny nói chuyện?", a: "Nhắn \"/tone\" trên Zalo hoặc vào Cài Đặt > Phong cách Penny." },
];

export default function ContactPage() {
  return (
    <div className="space-y-4 pt-4">
      <PageHead title="Liên Hệ" description="Liên hệ hỗ trợ và câu hỏi thường gặp về Penny" />
      <h1 className="font-heading text-xl font-bold sm:text-2xl">Liên hệ & Hỗ trợ</h1>

      {/* Penny Greeting */}
      <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/50">
        <CardContent className="flex items-center gap-4 p-4">
          <img src={pennyLogo} alt="Penny" className="size-16 shrink-0" />
          <div>
            <p className="text-sm font-medium">Cần giúp đỡ?</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Penny luôn sẵn sàng hỗ trợ bạn! Nhắn tin trực tiếp trên Zalo hoặc liên hệ qua các kênh bên dưới.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Contact Methods */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Kênh liên hệ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button variant="outline" className="w-full justify-start gap-3 h-auto py-3" asChild>
            <a href="https://zalo.me" target="_blank" rel="noopener noreferrer">
              <MessageCircle className="size-4 shrink-0 text-primary" />
              <div className="text-left">
                <p className="text-sm font-medium">Zalo OA</p>
                <p className="text-xs text-muted-foreground">Nhắn tin trực tiếp trên Zalo</p>
              </div>
              <ExternalLink className="ml-auto size-3 text-muted-foreground" />
            </a>
          </Button>
          <Button variant="outline" className="w-full justify-start gap-3 h-auto py-3" asChild>
            <a href="mailto:support@penny.vn">
              <Mail className="size-4 shrink-0 text-primary" />
              <div className="text-left">
                <p className="text-sm font-medium">Email</p>
                <p className="text-xs text-muted-foreground">support@penny.vn</p>
              </div>
            </a>
          </Button>
          <Button variant="outline" className="w-full justify-start gap-3 h-auto py-3" asChild>
            <a href="tel:+84123456789">
              <Phone className="size-4 shrink-0 text-primary" />
              <div className="text-left">
                <p className="text-sm font-medium">Hotline</p>
                <p className="text-xs text-muted-foreground">0123 456 789</p>
              </div>
            </a>
          </Button>
        </CardContent>
      </Card>

      {/* FAQ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <HelpCircle className="size-4 text-primary" />
            Câu hỏi thường gặp
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {faqs.map((faq, i) => (
            <div key={i}>
              <p className="text-sm font-medium">{faq.q}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{faq.a}</p>
              {i < faqs.length - 1 && <Separator className="mt-3" />}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Legal Links */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Thông tin pháp lý</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button variant="ghost" className="w-full justify-start gap-2 text-sm" asChild>
            <a href="/privacy"><Shield className="size-3.5" /> Quyền riêng tư</a>
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-2 text-sm" asChild>
            <a href="/terms"><FileText className="size-3.5" /> Điều khoản sử dụng</a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
