export interface ParsedExpense {
  description: string;
  amount: number;
  category: string;
  date: string;
}

export interface DateFilter {
  start: string;
  end: string;
}

export interface DeleteTarget {
  description?: string;
  amount?: number;
  date?: string;
}

export interface EditTarget {
  match?: { description?: string; amount?: number; date?: string };
  changes?: { amount?: number; description?: string; category?: string };
}
