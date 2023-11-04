import { app } from './app';
import dotenv from 'dotenv';

dotenv.config();

// Create server
app.listen(process.env.PORT, () => {
    console.log(`server listening on port ${process.env.PORT}`);
});