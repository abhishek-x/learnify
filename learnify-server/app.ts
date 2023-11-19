import dotenv from 'dotenv';
import express, { NextFunction, Request, Response } from 'express';
export const app = express();
import cookieParser from 'cookie-parser';
import cors from 'cors';

import { ErrorMiddleware } from './middlewares/error';
import userRouter from './routes/user.route';
import courseRouter from './routes/course.route';
import orderRouter from './routes/order.route';
import notificationRouter from './routes/notification.route';
import analyticsRouter from './routes/analytics.route';

dotenv.config();

// Body Parser
app.use(express.json({
    limit: "50mb",
}));

// Cookie Parser
app.use(cookieParser());

// CORS - Cross-Origin Resource Sharing
app.use(cors({
    origin: process.env.ORIGIN,
}));

// Routes
app.use("/api/v1", userRouter, courseRouter, orderRouter, notificationRouter, analyticsRouter);

// Testing API
app.get('/test', (req: Request, res: Response, next: NextFunction) => {
    res.status(200).json({
        success: true,
        message: "API is working 🎉",
    });
});

// Unknown Route
app.all('*', (req: Request, res: Response, next: NextFunction) => {
    const err = new Error(`Route ${req.originalUrl} not found`) as any;
    err.statusCode = 404;
    next(err);
});

app.use(ErrorMiddleware);