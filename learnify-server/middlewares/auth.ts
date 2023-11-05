import dotenv from 'dotenv';
import { NextFunction, Request, Response } from "express";
import { CatchAsyncError } from "./catchAsyncError";
import ErrorHandler from "../utils/ErrorHandler";
import jwt, { JwtPayload } from "jsonwebtoken";
import { redis } from '../utils/redis_connect';

dotenv.config();

// Authenticated User
export const isAuthenticated = CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
        const access_token = req.cookies.access_token as string;
        if (!access_token) {
            return next(new ErrorHandler("Please login to access this resource", 400));
        }

        const decoded = jwt.verify(access_token, process.env.ACCESS_TOKEN as string) as JwtPayload;
        if (!decoded) {
            return next(new ErrorHandler("Access token not valid", 400));
        }

        const user = await redis.get(decoded.id);
        if (!user) {
            return next(new ErrorHandler("User not found", 400));
        }

        req.user = JSON.parse(user);
        next();

    }
);

// Validate User Role
export const authorizeRoles = (...Roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!Roles.includes(req.user?.role || '')) {
            return next(new ErrorHandler(`Role ${req.user?.role} is not allowed to access ths resource`, 403));
        }
        next();
    }
}