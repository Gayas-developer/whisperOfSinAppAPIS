import mongoose from "mongoose";

const connectDb = async () => {
    console.log(process.env.MONGO_URI);
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI).then(() => {
            console.log("Connected to mongoDb")
            console.log('MongoDb host', mongoose.connection.host.white)

        })
    } catch (error) {
        console.log('Error in connectDb');
    }
}

export default connectDb;