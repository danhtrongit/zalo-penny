import { Router } from "express";
import {
  listTransactions,
  getTransaction,
  updateTransaction,
  deleteTransaction,
} from "../controllers/transaction.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { asyncHandler } from "../middlewares/async-handler";
import { validate } from "../middlewares/validate.middleware";
import {
  listTransactionsQuery,
  transactionIdParams,
  updateTransactionBody,
} from "../validators/transaction.schema";

const router = Router();

router.use(authMiddleware);

router.get(
  "/",
  validate({ query: listTransactionsQuery }),
  asyncHandler(listTransactions)
);
router.get(
  "/:id",
  validate({ params: transactionIdParams }),
  asyncHandler(getTransaction)
);
router.put(
  "/:id",
  validate({ params: transactionIdParams, body: updateTransactionBody }),
  asyncHandler(updateTransaction)
);
router.delete(
  "/:id",
  validate({ params: transactionIdParams }),
  asyncHandler(deleteTransaction)
);

export default router;
