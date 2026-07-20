import { Router, type IRouter } from "express";
import healthRouter from "./health";
import paymentRouter from "./payment";
import scanRouter from "./scan";
import scanPreviewRouter from "./scan-preview";
import scanHistoryRouter from "./scan-history";

const router: IRouter = Router();

router.use(healthRouter);
router.use(paymentRouter);
router.use(scanRouter);
router.use(scanPreviewRouter);
router.use(scanHistoryRouter);

export default router;
