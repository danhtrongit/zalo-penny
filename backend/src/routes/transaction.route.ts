import { Router } from "express";
import {
  listTransactions,
  getTransaction,
  updateTransaction,
  deleteTransaction,
} from "../controllers/transaction.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

router.get("/", authMiddleware, listTransactions);
router.get("/:id", authMiddleware, getTransaction);
router.put("/:id", authMiddleware, updateTransaction);
router.delete("/:id", authMiddleware, deleteTransaction);

export default router;
