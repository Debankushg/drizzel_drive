import { z } from 'zod';

/** A file/folder name: no slashes or control characters, not "." or "..". */
const nameSchema = z
  .string()
  .trim()
  .min(1, 'Name is required')
  .max(200, 'Name must be at most 200 characters')
  .refine((n) => !/[\\/]/.test(n) && n !== '.' && n !== '..' && !/[\u0000-\u001f]/.test(n), {
    message: 'Name contains invalid characters',
  });

/** Accepts a number, a numeric string, or empty/null (= top level). */
const folderIdSchema = z.preprocess(
  (v) => (v === undefined || v === null || v === '' || v === 'null' ? null : v),
  z.coerce.number().int().positive().nullable(),
);

export const createFolderSchema = z.object({
  name: nameSchema,
  parentId: folderIdSchema,
});

export const moveFolderSchema = z.object({ parentId: folderIdSchema });
export const moveFileSchema = z.object({ folderId: folderIdSchema });

export const shareSchema = z.object({
  itemType: z.enum(['file', 'folder']),
  itemId: z.coerce.number().int().positive(),
  email: z.string().trim().toLowerCase().email('Invalid email address'),
});

export const renameSchema = z.object({ name: nameSchema });

/** Multipart text fields sent next to the uploaded file. */
export const uploadFileSchema = z.object({
  name: nameSchema.optional().or(z.literal('').transform(() => undefined)),
  folderId: folderIdSchema,
  /** "rename" keeps both files when the name is taken ("a (1).png"); default is to reject with 409. */
  onConflict: z.enum(['fail', 'rename']).default('fail'),
});

/** Find-or-create a chain of nested folders, e.g. ["Photos", "2026", "Trip"]. */
export const ensurePathSchema = z.object({
  parentId: folderIdSchema,
  path: z.array(nameSchema).min(1, 'Path is required').max(20, 'Folders are nested too deeply'),
});

export type CreateFolderInput = z.infer<typeof createFolderSchema>;
export type RenameInput = z.infer<typeof renameSchema>;
export type UploadFileInput = z.infer<typeof uploadFileSchema>;
export type EnsurePathInput = z.infer<typeof ensurePathSchema>;
