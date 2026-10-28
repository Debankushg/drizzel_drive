import { fileRepository } from '../repositories/file.repository';
import { folderRepository } from '../repositories/folder.repository';
import { shareRepository } from '../repositories/share.repository';
import { userRepository } from '../repositories/user.repository';
import type { ShareItemType, ShareRecipient, SharedBy, SharedContents } from '../types/share.types';
import { ApiError } from '../utils/ApiError';
import { toFileItem, toFolderItem } from './drive.mapper';
import { fileService } from './file.service';
import { folderService } from './folder.service';

const notFound = () => new ApiError(404, 'Folder not found');

export const shareService = {
  /** Shares a file or folder (view-only) with another registered user, found by email. */
  async create(ownerId: number, type: ShareItemType, itemId: number, email: string): Promise<ShareRecipient> {
    if (type === 'file') await fileService.getOwned(ownerId, itemId);
    else await folderService.getOwned(ownerId, itemId);

    const recipient = await userRepository.findByEmail(email);
    if (!recipient) throw new ApiError(404, 'No user with that email address');
    if (recipient.id === ownerId) throw ApiError.badRequest("You can't share with yourself");
    if (await shareRepository.find(recipient.id, type, itemId)) {
      throw ApiError.conflict(`Already shared with ${recipient.email}`);
    }

    const share = await shareRepository.create(ownerId, recipient.id, type, itemId);
    return {
      shareId: share.id,
      userId: recipient.id,
      name: recipient.name,
      email: recipient.email,
      createdAt: share.createdAt,
    };
  },

  async listRecipients(ownerId: number, type: ShareItemType, itemId: number): Promise<ShareRecipient[]> {
    if (type === 'file') await fileService.getOwned(ownerId, itemId);
    else await folderService.getOwned(ownerId, itemId);
    return shareRepository.listRecipients(ownerId, type, itemId);
  },

  /** The owner can revoke a share; the recipient can remove it from their own "Shared with me". */
  async revoke(userId: number, shareId: number) {
    const share = await shareRepository.findById(shareId);
    if (!share || (share.ownerId !== userId && share.recipientId !== userId)) {
      throw new ApiError(404, 'Share not found');
    }
    await shareRepository.delete(shareId);
  },

  /** "Shared with me": top-level shares, or the contents of a shared folder. */
  async browse(userId: number, folderId: number | null): Promise<SharedContents> {
    if (folderId === null) {
      const [folderShares, fileShares] = await Promise.all([
        shareRepository.listFoldersForRecipient(userId),
        shareRepository.listFilesForRecipient(userId),
      ]);
      return {
        folder: null,
        breadcrumbs: [],
        owner: null,
        folders: folderShares
          .map((s) => ({ ...toFolderItem(s.folder), shareId: s.shareId, sharedBy: s.owner }))
          .sort((a, b) => a.name.localeCompare(b.name)),
        files: fileShares
          .map((s) => ({ ...toFileItem(s.file, userId), shareId: s.shareId, sharedBy: s.owner }))
          .sort((a, b) => a.name.localeCompare(b.name)),
      };
    }

    // chain[0] is the folder being opened, the last element is its top-level ancestor
    const chain = await folderRepository.ancestorChain(folderId);
    const current = chain[0];
    if (!current || chain.some((f) => f.deletedAt)) throw notFound();

    const sharedIds = new Set(await shareRepository.sharedFolderIds(userId, chain.map((f) => f.id)));
    // Topmost shared folder = where the recipient's access starts
    const rootIndex = chain.map((f) => sharedIds.has(f.id)).lastIndexOf(true);
    if (rootIndex === -1) throw notFound();

    const ownerId = current.userId;
    const [owner, folders, files] = await Promise.all([
      userRepository.findById(ownerId),
      folderRepository.listByParent(ownerId, folderId),
      fileRepository.listByFolder(ownerId, folderId),
    ]);

    return {
      folder: toFolderItem(current),
      breadcrumbs: chain.slice(0, rootIndex + 1).reverse().map((f) => ({ id: f.id, name: f.name })),
      owner: owner ? ({ name: owner.name, email: owner.email } satisfies SharedBy) : null,
      folders: folders.map(toFolderItem),
      files: files.map((f) => toFileItem(f, userId)),
    };
  },
};
