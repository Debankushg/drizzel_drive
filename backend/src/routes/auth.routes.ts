import { Router } from "express";
import { login, me, register } from "../controllers/auth.controller";
import { finishOAuth, startOAuth } from "../controllers/oauth.controller";
import { authenticate } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import { loginSchema, registerSchema } from "../validators/auth.validator";

const router = Router();

router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.get("/me", authenticate, me);

// Social login: /auth/google, /auth/github, /auth/linkedin (+ /callback)
router.get("/:provider", startOAuth);
router.get("/:provider/callback", finishOAuth);

export default router;
