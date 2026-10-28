/** Must match the backend allow-list (backend/src/utils/fileTypes.ts). */
export const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.mp4'];

/** Must not exceed MAX_FILE_SIZE_MB on the backend. */
export const MAX_FILE_SIZE_MB = 200;
