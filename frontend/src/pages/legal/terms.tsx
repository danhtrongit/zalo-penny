import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PageHead } from "@/components/page-head";

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <PageHead title="Điều khoản sử dụng" description="Điều khoản sử dụng dịch vụ Penny." canonical="/terms" />
      <Link to="/">
        <Button variant="ghost" className="mb-8">← Trang chủ</Button>
      </Link>
      <h1 className="font-heading text-3xl font-bold mb-8">Điều khoản sử dụng</h1>
      <div className="prose prose-neutral dark:prose-invert space-y-6">
        <section>
          <h2 className="text-xl font-semibold">1. Chấp nhận điều khoản</h2>
          <p>Khi sử dụng Penny, bạn đồng ý với các điều khoản dưới đây.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold">2. Dịch vụ</h2>
          <p>Penny cung cấp dịch vụ quản lý chi tiêu cá nhân thông qua Zalo Bot và Dashboard web. Dịch vụ yêu cầu đăng ký và mua gói subscription.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold">3. Thanh toán</h2>
          <p>Các gói subscription được thanh toán trước. Không hoàn tiền sau khi thanh toán thành công, trừ trường hợp đặc biệt.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold">4. Trách nhiệm</h2>
          <p>Penny không chịu trách nhiệm về quyết định tài chính của người dùng dựa trên dữ liệu và phân tích do dịch vụ cung cấp.</p>
        </section>
      </div>
    </div>
  );
}
