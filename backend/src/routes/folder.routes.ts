import { Router } from "express";
import {
  createFolder,
  ensureFolderPath,
  moveFolder,
  renameFolder,
  trashFolder,
} from "../controllers/folder.controller";
import { authenticate } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import {
  createFolderSchema,
  ensurePathSchema,
  moveFolderSchema,
  renameSchema,
} from "../validators/drive.validator";

const router = Router();

router.use(authenticate);
router.post("/", validate(createFolderSchema), createFolder);
router.post("/ensure-path", validate(ensurePathSchema), ensureFolderPath);
router.patch("/:id", validate(renameSchema), renameFolder);
router.patch("/:id/move", validate(moveFolderSchema), moveFolder);
router.delete("/:id", trashFolder);

export default router;
