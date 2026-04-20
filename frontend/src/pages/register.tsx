import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Strip non-digit chars (handles RTL marks, spaces, dashes etc from paste)
    const cleanedPhone = phone.replace(/[^\d]/g, "");

    // Phone validation: starts with 0, 10-11 digits
    if (!/^0\d{9,10}$/.test(cleanedPhone)) {
      setError("Số điện thoại không hợp lệ (bắt đầu bằng 0, 10-11 chữ số)");
      return;
    }

    setLoading(true);
    try {
      await register(cleanedPhone, password, name, email || undefined);
      navigate("/pricing");
    } catch (err: any) {
      setError(err.response?.data?.error || "Đăng ký thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-heading">Đăng ký</CardTitle>
          <CardDescription>Tạo tài khoản để sử dụng Penny</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Tên</Label>
              <Input
                id="name"
                placeholder="Tên của bạn"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Số điện thoại</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="0912345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mật khẩu</Label>
              <Input
                id="password"
                type="password"
                placeholder="Tối thiểu 6 ký tự"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email <span className="text-muted-foreground text-xs">(không bắt buộc)</span></Label>
              <Input
                id="email"
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Đang xử lý..." : "Đăng ký"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Đã có tài khoản?{" "}
            <Link to="/login" className="text-primary hover:underline">
              Đăng nhập
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
