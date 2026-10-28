import type { RawUpload, UploadSelection } from '@/lib/uploader';

const readFile = (entry: FileSystemFileEntry) => new Promise<File>((resolve, reject) => entry.file(resolve, reject));

/** readEntries returns at most ~100 entries per call, so keep calling until it returns none. */
async function readAllEntries(dir: FileSystemDirectoryEntry): Promise<FileSystemEntry[]> {
  const reader = dir.createReader();
  const all: FileSystemEntry[] = [];
  for (;;) {
    const batch = await new Promise<FileSystemEntry[]>((resolve, reject) => reader.readEntries(resolve, reject));
    if (!batch.length) return all;
    all.push(...batch);
  }
}

/**
 * Reads files AND folders (recursively) from a drag-and-drop. Must be called straight from the
 * drop event handler: the browser empties the DataTransfer as soon as the handler returns.
 */
export async function readDropped(dt: DataTransfer): Promise<UploadSelection> {
  // Grab everything synchronously, before the first await
  const entries = Array.from(dt.items ?? []).flatMap((item) => {
    const entry = item.kind === 'file' ? item.webkitGetAsEntry() : null;
    return entry ? [entry] : [];
  });
  const plainFiles = Array.from(dt.files ?? []);

  const files: RawUpload[] = [];
  const dirs: string[][] = [];

  const walk = async (entry: FileSystemEntry, parents: string[]): Promise<void> => {
    if (entry.isFile) {
      files.push({ file: await readFile(entry as FileSystemFileEntry), dirs: parents });
    } else if (entry.isDirectory) {
      const path = [...parents, entry.name];
      dirs.push(path);
      for (const child of await readAllEntries(entry as FileSystemDirectoryEntry)) await walk(child, path);
    }
  };

  if (entries.length) {
    for (const entry of entries) await walk(entry, []);
  } else {
    // Browsers without the directory API: plain files only
    plainFiles.forEach((file) => files.push({ file, dirs: [] }));
  }
  return { files, dirs };
}
