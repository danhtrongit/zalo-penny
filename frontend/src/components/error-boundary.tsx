import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
}

/**
 * Catches render-time crashes in the dashboard so a single broken page shows a
 * recoverable message instead of blanking the whole app.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("Dashboard render error:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[50svh] flex-col items-center justify-center gap-3 p-6 text-center">
          <p className="font-heading text-lg font-semibold">Có lỗi hiển thị</p>
          <p className="max-w-xs text-sm text-muted-foreground">
            Trang gặp sự cố ngoài ý muốn. Bạn thử tải lại nhé.
          </p>
          <Button onClick={() => window.location.reload()}>Tải lại</Button>
        </div>
      );
    }
    return this.props.children;
  }
}
