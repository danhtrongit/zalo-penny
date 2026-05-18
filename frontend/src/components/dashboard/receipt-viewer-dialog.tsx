import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ReceiptViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileUrl: string | null;
  fileType: string | null;
}

export function ReceiptViewerDialog({
  open,
  onOpenChange,
  fileUrl,
  fileType,
}: ReceiptViewerDialogProps) {
  if (!fileUrl) return null;

  const isPdf = fileType === "PDF";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 sm:max-w-3xl">
        <DialogHeader className="border-b px-4 py-3">
          <DialogTitle className="text-sm">Hoá đơn gốc</DialogTitle>
        </DialogHeader>
        <div className="max-h-[80vh] overflow-auto bg-muted/30">
          {isPdf ? (
            <iframe
              src={fileUrl}
              title="Hoá đơn PDF"
              className="h-[80vh] w-full"
            />
          ) : (
            <img
              src={fileUrl}
              alt="Hoá đơn"
              className="mx-auto block max-h-[80vh] w-auto"
            />
          )}
        </div>
        <div className="border-t px-4 py-2 text-right">
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline"
          >
            Mở trong tab mới ↗
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}
