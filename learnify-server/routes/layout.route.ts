import express from 'express';
import { authorizeRoles, isAuthenticated } from '../middlewares/auth';
import { CreateLayout } from '../controllers/layout.controller';

const layoutRouter = express.Router();

layoutRouter.post('/create-layout', isAuthenticated, authorizeRoles("admin"), CreateLayout);

export default layoutRouter;