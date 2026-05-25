import connectDB from "./connectMongo.js";
import StrategySchema from "../models/strategy.js";

export const rexStgDelete = async () => {
    await connectDB();

    const deleted = await StrategySchema.deleteMany({
        name: { $regex: /RPT/i }
    });

    console.log(`Deleted ${deleted.deletedCount} strategies`);
};

export default rexStgDelete;