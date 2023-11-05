import { Response } from "express";
import userModel from "../models/user.model";

// Get user by ID
export const getUserById = async (id: string, res: Response) => {
    const user = await userModel.findById(id);
    res.status(200).json({
        success: true,
        user,
    });
}