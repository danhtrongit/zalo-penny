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
}
