import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import { getReferralSummary } from "../services/referral.service";

// The shareable link is built client-side from window.location.origin, so the
// API only needs to return the code + stats.
export const myReferral = async (req: AuthRequest, res: Response) => {
  const summary = await getReferralSummary(req.userId!);
  res.json(summary);
};
