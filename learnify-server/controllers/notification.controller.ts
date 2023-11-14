import { Request, Response, NextFunction } from "express";

import NotificationModel from "../models/notification.model";
import ErrorHandler from "../utils/ErrorHandler";
import { CatchAsyncError } from "../middlewares/catchAsyncError";

// get all notifications -- only admin
export const getNotifications = CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const notifications = await NotificationModel.find().sort({ createdAt: -1 });
            res.status(200).json({
                success: true,
                notifications,
            });
        }
        catch (error: any) {
            return next(new ErrorHandler(error.message, 500));
        }
    }
);