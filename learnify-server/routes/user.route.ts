import express from 'express';
import { activateUser, loginUser, logoutUser, registrationUser, updateAccessToken } from '../controllers/user.controller';
import { isAuthenticated } from '../middlewares/auth';

const userRouter = express.Router();

userRouter.post('/registration', registrationUser);
userRouter.post('/activate-user', activateUser);
userRouter.post('/login', loginUser);
userRouter.get('/logout', isAuthenticated, logoutUser);
userRouter.get('/refresh', updateAccessToken);

export default userRouter;