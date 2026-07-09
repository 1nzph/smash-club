import { Router } from "express";
import {
  createBooking,
  listMyBookings,
  cancelBooking,
  listOpenMatches,
  joinMatch,
  leaveMatch,
} from "../controllers/booking.controller";
import { authGuard } from "../middleware/auth.middleware";

const router = Router();

router.post("/", authGuard, createBooking);
router.get("/mine", authGuard, listMyBookings);
router.get("/open", listOpenMatches); // público
router.post("/:id/join", authGuard, joinMatch);
router.delete("/:id/leave", authGuard, leaveMatch);
router.delete("/:id", authGuard, cancelBooking);

export default router;
