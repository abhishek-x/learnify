import { Request, Response, NextFunction } from "express";
import cron from "node-cron";

import NotificationModel from "../models/notification.model";
import ErrorHandler from "../utils/ErrorHandler";
import { CatchAsyncError } from "../middlewares/catchAsyncError";

// get all notifications -- only admin
export const getNotifications = CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const notifications = await NotificationModel.find().sort({ createdAt: -1 });
            res.status(201).json({
                success: true,
                notifications,
            });
        }
        catch (error: any) {
            return next(new ErrorHandler(error.message, 500));
        }
    }
);

// update notification status -- only admin
export const updateNotification = CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const notification = await NotificationModel.findById(req.params.id);

            if (!notification) {
                return next(new ErrorHandler("Notification not found", 404));
            } else {
                notification.status ? notification.status = "read" : notification.status;
            }

            await notification.save();

            const notifications = await NotificationModel.find().sort({ createdAt: -1 });

            res.status(201).json({
                success: true,
                notifications,
            });
        }
        catch (error: any) {
            return next(new ErrorHandler(error.message, 500));
        }
    }
);

// delete "read" notification every mid-night (00:00:00 - cron) that are created more than 30 days ago
cron.schedule("0 0 0 * * *", async () => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    await NotificationModel.deleteMany({ status: "read", createdAt: { $lt: thirtyDaysAgo } });
});