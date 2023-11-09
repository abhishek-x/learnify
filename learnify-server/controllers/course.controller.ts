import { Request, Response, NextFunction } from "express";
import { CatchAsyncError } from "../middlewares/catchAsyncError";
import ErrorHandler from "../utils/ErrorHandler";

import cloudinary from "cloudinary";
import { createCourse } from "../services/course.service";
import CourseModel from "../models/course.model";
import { redis } from "../utils/redis_connect";
import mongoose from "mongoose";

// upload course
export const uploadCourse = CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = req.body;
            const thumbnail = data.thumbnail;
            if (thumbnail) {
                const myCloud = await cloudinary.v2.uploader.upload(thumbnail, {
                    folder: "courses",
                });

                data.thumbnail = {
                    public_id: myCloud.public_id,
                    url: myCloud.secure_url,
                }
            }
            createCourse(data, res, next);
        }
        catch (error: any) {
            return next(new ErrorHandler(error.message, 500));
        }
    }
);

// edit course
export const editCourse = CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = req.body;

            const thumbnail = data.thumbnail;
            if (thumbnail) {
                await cloudinary.v2.uploader.destroy(thumbnail.public_id);

                const myCloud = await cloudinary.v2.uploader.upload(thumbnail, {
                    folder: "courses",
                });

                data.thumbnail = {
                    public_id: myCloud.public_id,
                    url: myCloud.secure_url,
                }
            }

            const courseId = req.params.id;

            const course = await CourseModel.findByIdAndUpdate(
                courseId,
                { $set: data },
                { new: true }
            );

            res.status(201).json({
                success: true,
                course,
            });
        }
        catch (error: any) {
            return next(new ErrorHandler(error.message, 500));
        }
    }
);

// get single course -- without purchasing
export const getSingleCourse = CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const courseId = req.params.id;
            const cachedCourse = await redis.get(courseId);

            const course = cachedCourse
                ? JSON.parse(cachedCourse)
                : await CourseModel.findById(courseId).select(
                    "-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links"
                );

            if (!cachedCourse) {
                await redis.set(courseId, JSON.stringify(course));
            }

            res.status(200).json({
                success: true,
                course,
            });
        }
        catch (error: any) {
            return next(new ErrorHandler(error.message, 500));
        }
    }
);

// get all courses -- without purchasing
export const getAllCourses = CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const cacheKey = "allCourses";
            const cachedCourses = await redis.get(cacheKey);

            let courses;

            if (cachedCourses) {
                courses = JSON.parse(cachedCourses);
            } else {
                courses = await CourseModel.find().select(
                    "-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links"
                );
                await redis.set(cacheKey, JSON.stringify(courses));
            }

            res.status(200).json({
                success: true,
                courses,
            });
        }
        catch (error: any) {
            return next(new ErrorHandler(error.message, 500));
        }
    }
);

// get course content -- only for valid user
export const getCourseByUser = CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userCourseList = req.user?.courses;
            const courseId = req.params.id;

            const courseExists = userCourseList?.find(
                (course: any) => course._id.toString() === courseId
            );

            if (!courseExists) {
                return next(new ErrorHandler("You are not eligible to access this course", 404));
            }

            const course = await CourseModel.findById(courseId);
            const content = course?.courseData;

            res.status(200).json({
                success: true,
                content,
            });
        }
        catch (error: any) {
            return next(new ErrorHandler(error.message, 500));
        }
    }
);

// add question in course
interface IAddQuestionData {
    question: string;
    courseId: string;
    contentId: string;
}

export const addQuestion = CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { question, courseId, contentId }: IAddQuestionData = req.body;
            const course = await CourseModel.findById(courseId);

            if (!mongoose.Types.ObjectId.isValid(contentId)) {
                return next(new ErrorHandler("Invalid Content ID", 400));
            }

            const courseContent = course?.courseData?.find((item: any) => item._id.equals(contentId));
            if (!courseContent) {
                return next(new ErrorHandler("Invalid Content ID", 400));
            }

            // create a new question object
            const newQuestion: any = {
                user: req.user,
                question,
                questionReplies: [],
            }

            // add this question to our course content
            courseContent.questions.push(newQuestion);

            // save the updated course
            await course?.save();

            res.status(200).json({
                success: true,
                course,
            });
        }
        catch (error: any) {
            return next(new ErrorHandler(error.message, 500));
        }
    }
);