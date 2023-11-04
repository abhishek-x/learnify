import mongoose from 'mongoose'; 
import dotenv from 'dotenv'; 

dotenv.config();

const database_url: string = process.env.MONGO_DB_URL || '';

const connectDB = async () => {
    try {
        await mongoose.connect(database_url).then((data: any) => {
            console.log(`Database connected with ${data.connection.host}`);
        });
    } catch (error: any) {
        console.log(error.message);
        setTimeout(connectDB, 5000);
    }
}

export default connectDB;