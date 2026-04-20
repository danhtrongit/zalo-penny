import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, MessageSquare, MapPin } from "lucide-react";

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <Link to="/">
        <Button variant="ghost" className="mb-8">← Trang chủ</Button>
      </Link>
      <h1 className="font-heading text-3xl font-bold mb-8">Liên hệ</h1>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <Mail className="size-8 text-primary" />
            <CardTitle className="text-lg">Email</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">support@penny.vn</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <MessageSquare className="size-8 text-primary" />
            <CardTitle className="text-lg">Zalo</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Nhắn tin trực tiếp cho Penny trên Zalo</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <MapPin className="size-8 text-primary" />
            <CardTitle className="text-lg">Địa chỉ</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">TP. Hồ Chí Minh, Việt Nam</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
