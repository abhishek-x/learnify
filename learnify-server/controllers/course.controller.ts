import cloudinary from "cloudinary";
import mongoose from "mongoose";
import path from "path";
import ejs from "ejs";
import { Request, Response, NextFunction } from "express";

import CourseModel from "../models/course.model";
import sendMail from "../utils/sendMail";
import ErrorHandler from "../utils/ErrorHandler";
import { redis } from "../utils/redis_connect";
import { createCourse } from "../services/course.service";
import { CatchAsyncError } from "../middlewares/catchAsyncError";
import NotificationModel from "../models/notification.model";

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

            await NotificationModel.create({
                user: req.user?._id,
                title: 'New Question Received',
                message: `You have a new question in ${courseContent.title}`,
            });

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

interface IAddAnswerData {
    answer: string;
    courseId: string;
    contentId: string;
    questionId: string;
}

export const addAnswer = CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { answer, courseId, contentId, questionId }: IAddAnswerData = req.body;

            const course = await CourseModel.findById(courseId);

            if (!mongoose.Types.ObjectId.isValid(contentId)) {
                return next(new ErrorHandler("Invalid Content ID", 400));
            }

            const courseContent = course?.courseData?.find((item: any) => item._id.equals(contentId));
            if (!courseContent) {
                return next(new ErrorHandler("Invalid Content ID", 400));
            }

            const question = courseContent?.questions?.find((item: any) => item._id.equals(questionId));
            if (!question) {
                return next(new ErrorHandler("Invalid Question ID", 400));
            }

            // create a new answer object
            const newAnswer: any = {
                user: req.user,
                answer,
            }

            // add this answer to our course content
            question.questionReplies.push(newAnswer);

            // save the updated course
            await course?.save();

            if (req.user?._id === question.user._id) {
                // create a notification
                await NotificationModel.create({
                    user: req.user?._id,
                    title: 'New Question Reply Received',
                    message: `You have a new question reply in ${courseContent.title}`,
                });
            }
            else {
                const data = {
                    name: question.user.name,
                    title: courseContent.title,
                }

                const html = await ejs.renderFile(path.join(__dirname, "../mails/question-reply.ejs"), data);

                try {
                    await sendMail({
                        email: question.user.email,
                        subject: "Question Reply",
                        template: "question-reply.ejs",
                        data,
                    });
                } catch (error: any) {
                    return next(new ErrorHandler(error.message, 500));
                }
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

// add review in course
interface IAddReviewData {
    review: string;
    rating: number;
    userId: string;
}

export const addReview = CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userCourseList = req.user?.courses;
            const courseId = req.params.id;

            // check if course id already exists in userCourseList based on _id
            const courseExists = userCourseList?.some((course: any) => course._id.toString() === courseId.toString());
            if (!courseExists) {
                return next(new ErrorHandler("You are not eligible to access this course.", 404));
            }

            const course = await CourseModel.findById(courseId);
            const { review, rating } = req.body as IAddReviewData;

            const reviewData: any = {
                user: req.user,
                comment: review,
                rating,
            }

            course?.reviews.push(reviewData);

            let avg = 0;
            course?.reviews.forEach((review: any) => {
                avg += review.rating;
            });
            if (course) {
                course.ratings = avg / course.reviews.length;
            }

            await course?.save();

            const notification = {
                title: "New Review Received",
                message: `${req.user?.name} has given a review in course {course?.name}`,
            }

            // create notification
            await NotificationModel.create({
                user: req.user?._id,
                title: 'New Review Received',
                message: `${req.user?.name} has given a review in course ${course?.name}`,
            });

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

// add reply in review (only for admin)
interface IAddReviewData {
    comment: string;
    courseId: string;
    reviewId: string;
}

export const addReplyToReview = CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { comment, courseId, reviewId } = req.body as IAddReviewData;

            const course = await CourseModel.findById(courseId);
            if (!course) {
                return next(new ErrorHandler("Course not found", 404));
            }

            const review = course?.reviews?.find((rev: any) => rev._id.toString() === reviewId);
            if (!review) {
                return next(new ErrorHandler("Review not found", 404));
            }

            const replyData: any = {
                user: req.user,
                comment,
            }

            if (!review.commentReplies) {
                review.commentReplies = [];
            }
            review.commentReplies?.push(replyData);

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