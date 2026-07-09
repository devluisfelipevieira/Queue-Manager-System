import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import desksRouter from "./desks";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(desksRouter);

export default router;
