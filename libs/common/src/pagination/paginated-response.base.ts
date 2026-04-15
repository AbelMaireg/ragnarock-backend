export interface PaginatedResponseBase<T> {
  items: T[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}
