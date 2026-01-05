export interface HistoryItem {
  id: string;
  category: 'wallet' | 'trade';
  type: string;
  amount: number;
  status?: string;
  method?: string;
  asset?: string;
  direction?: string;
  result?: string;
  payout?: number;
  profit?: number;
  mode?: 'demo' | 'real';
  date: Date;
  description: string;
}

export interface CombinedHistoryResponse {
  data: HistoryItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}