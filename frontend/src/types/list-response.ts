export interface ListResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}
