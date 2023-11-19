import express from 'express';
import { authorizeRoles, isAuthenticated } from '../middlewares/auth';
import { CreateLayout, EditLayout, getLayoutByType } from '../controllers/layout.controller';

const layoutRouter = express.Router();

layoutRouter.post('/create-layout', isAuthenticated, authorizeRoles("admin"), CreateLayout);
layoutRouter.put('/edit-layout', isAuthenticated, authorizeRoles("admin"), EditLayout);
layoutRouter.get('/get-layout', isAuthenticated, getLayoutByType);

export default layoutRouter;