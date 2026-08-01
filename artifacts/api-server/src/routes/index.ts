import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import desksRouter from "./desks";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(desksRouter);
router.use(adminRouter);

export default router;
