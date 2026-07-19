import { Router, type IRouter } from "express";
import healthRouter from "./health";
import paymentRouter from "./payment";
import scanRouter from "./scan";

const router: IRouter = Router();

router.use(healthRouter);
router.use(paymentRouter);
router.use(scanRouter);

export default router;
