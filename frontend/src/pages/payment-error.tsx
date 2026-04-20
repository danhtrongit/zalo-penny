import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { XCircle } from "lucide-react";

export default function PaymentErrorPage() {
  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <XCircle className="mx-auto mb-4 size-16 text-destructive" />
          <CardTitle className="text-2xl">Thanh toán thất bại</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Có lỗi xảy ra trong quá trình thanh toán. Vui lòng thử lại.
          </p>
          <Link to="/pricing">
            <Button className="w-full">Thử lại</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
