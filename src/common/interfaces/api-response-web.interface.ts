export interface ApiResponseWeb<T> {
    success: boolean;
    message: string;
    data: T | null;
}