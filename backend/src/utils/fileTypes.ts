import path from 'node:path';

/** Allowed extensions -> the MIME type we serve them with (never trust the client's value). */
export const ALLOWED_FILE_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.mp4': 'video/mp4',
};

export const getExtension = (fileName: string) => path.extname(fileName).toLowerCase();

/** Appends `ext` unless the name already ends with it. */
export const withExtension = (name: string, ext: string) =>
  name.toLowerCase().endsWith(ext) ? name : `${name}${ext}`;

/** multer decodes multipart file names as latin1; restore UTF-8 names (e.g. "रिपोर्ट.pdf"). */
export const decodeFileName = (name: string) =>
  /[^\u0000-ÿ]/.test(name) ? name : Buffer.from(name, 'latin1').toString('utf8');

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

export const isImage = (name: string) => IMAGE_EXTENSIONS.includes(getExtension(name));
export const isPdf = (name: string) => getExtension(name) === '.pdf';
/** Files we can make a preview image for. */
export const hasThumbnail = (name: string) => isImage(name) || isPdf(name);
