import { app } from './app';
import dotenv from 'dotenv';
import connectDB from './utils/db_connect';

dotenv.config();

// Create server
app.listen(process.env.PORT, () => {
    console.log(`server listening on port ${process.env.PORT}`);
    connectDB();
});