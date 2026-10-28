import { Router } from "express";
import {
  getContents,
  getStorage,
  search,
} from "../controllers/drive.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

router.use(authenticate);
router.get("/", getContents);
router.get("/search", search);
router.get("/storage", getStorage);

export default router;
