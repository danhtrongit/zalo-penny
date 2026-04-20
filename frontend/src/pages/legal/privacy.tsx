import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <Link to="/">
        <Button variant="ghost" className="mb-8">← Trang chủ</Button>
      </Link>
      <h1 className="font-heading text-3xl font-bold mb-8">Chính sách quyền riêng tư</h1>
      <div className="prose prose-neutral dark:prose-invert space-y-6">
        <section>
          <h2 className="text-xl font-semibold">1. Thu thập thông tin</h2>
          <p>Penny thu thập thông tin cá nhân bao gồm: email, tên, dữ liệu chi tiêu, ảnh hóa đơn và các tin nhắn trao đổi trên Zalo Bot.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold">2. Sử dụng thông tin</h2>
          <p>Thông tin được sử dụng để: cung cấp dịch vụ quản lý chi tiêu, phân tích và báo cáo, cải thiện trải nghiệm người dùng.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold">3. Bảo mật</h2>
          <p>Chúng tôi cam kết bảo mật thông tin cá nhân và dữ liệu tài chính của bạn. Dữ liệu được mã hóa và lưu trữ an toàn.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold">4. Chia sẻ thông tin</h2>
          <p>Chúng tôi không chia sẻ thông tin cá nhân của bạn với bất kỳ bên thứ ba nào, trừ khi có sự đồng ý của bạn hoặc theo yêu cầu pháp luật.</p>
        </section>
      </div>
    </div>
  );
}
