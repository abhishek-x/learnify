import dotenv from 'dotenv';
import express, { NextFunction, Request, Response } from 'express';
export const app = express();
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { ErrorMiddleware } from './middlewares/error';

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