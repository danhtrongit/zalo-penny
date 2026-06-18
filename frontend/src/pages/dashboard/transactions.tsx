import { useEffect, useState } from "react";
import { PageHead } from "@/components/page-head";
import api from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Pencil, Trash2, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { getCategoryIcon } from "@/lib/category-icons";

interface Transaction {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  source: string;
}

const categories = ["Ăn uống", "Di chuyển", "Mua sắm", "Giải trí", "Hóa đơn", "Sức khỏe", "Giáo dục", "Nhà cửa", "Khác"];

function formatMoney(n: number) {
  return n.toLocaleString("vi-VN") + "đ";
}



export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterCategory, setFilterCategory] = useState("");
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [editForm, setEditForm] = useState({ description: "", amount: "", category: "", date: "" });

  const fetchTransactions = async () => {
    const params: Record<string, string> = { page: String(page), limit: "20" };
    if (filterCategory && filterCategory !== "all") params.category = filterCategory;
    const { data } = await api.get("/transactions", { params });
    setTransactions(data.data);
    setTotal(data.total);
    setTotalPages(data.totalPages);
  };

  useEffect(() => { fetchTransactions(); }, [page, filterCategory]);

  const handleEdit = (tx: Transaction) => {
    setEditing(tx);
    setEditForm({ description: tx.description, amount: String(tx.amount), category: tx.category, date: tx.date.slice(0, 10) });
  };

  const handleSave = async () => {
    if (!editing) return;
    try {
      await api.put(`/transactions/${editing.id}`, {
        description: editForm.description, amount: parseInt(editForm.amount),
        category: editForm.category, date: editForm.date,
      });
      toast.success("Đã cập nhật");
      setEditing(null);
      fetchTransactions();
    } catch { toast.error("Không thể cập nhật"); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Xác nhận xóa?")) return;
    try { await api.delete(`/transactions/${id}`); toast.success("Đã xóa"); fetchTransactions(); }
    catch { toast.error("Không thể xóa"); }
  };

  return (
    <div className="space-y-4 pt-4">
      <PageHead title="Giao Dịch" description="Xem và quản lý giao dịch chi tiêu" />
      {/* Header with back button */}
      <div className="flex items-center gap-3">
        <Link to="/dashboard">
          <Button variant="ghost" size="icon" className="size-8">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <h1 className="font-heading text-xl font-bold">Giao dịch</h1>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Select value={filterCategory} onValueChange={(v) => { setFilterCategory(v); setPage(1); }}>
          <SelectTrigger className="w-40 text-sm">
            <SelectValue placeholder="Tất cả" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            {categories.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">{total} giao dịch</span>
      </div>

      {/* Transaction List (mobile card style) */}
      <div className="space-y-2">
        {transactions.map((tx) => (
          <Card key={tx.id} className="transition-shadow hover:shadow-sm">
            <CardContent className="flex items-center gap-3 p-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-base">
                {(() => { const Icon = getCategoryIcon(tx.category); return <Icon className="size-4 text-primary" />; })()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{tx.description}</p>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">
                    {new Date(tx.date).toLocaleDateString("vi-VN")}
                  </span>
                  <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">{tx.category}</Badge>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <span className="text-sm font-semibold text-destructive">-{formatMoney(tx.amount)}</span>
                <Button variant="ghost" size="icon" className="size-7" onClick={() => handleEdit(tx)}>
                  <Pencil className="size-3" />
                </Button>
                <Button variant="ghost" size="icon" className="size-7" onClick={() => handleDelete(tx.id)}>
                  <Trash2 className="size-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {transactions.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Chưa có giao dịch nào
            </CardContent>
          </Card>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Trước</Button>
          <span className="text-xs text-muted-foreground">{page}/{totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Sau</Button>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa giao dịch</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Mô tả</Label>
              <Input value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Số tiền (VND)</Label>
              <Input type="number" value={editForm.amount} onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Danh mục</Label>
              <Select value={editForm.category} onValueChange={(v) => setEditForm({ ...editForm, category: v })}>
                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Ngày</Label>
              <Input type="date" value={editForm.date} onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setEditing(null)}>Hủy</Button>
            <Button onClick={handleSave}>Lưu</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
