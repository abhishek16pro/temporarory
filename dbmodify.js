import mongoose from 'mongoose';

const mongoUsername = encodeURIComponent('derivix@xts');
const mongoPassword = encodeURIComponent('derivix@xts');
const mongoDbName = "XTS";
const serverIp = "localhost";
const mongoAuthSource = process.env.MONGO_AUTH_SOURCE || "admin";
const MONGO_URI = `mongodb://${mongoUsername}:${mongoPassword}@${serverIp}:27017/${mongoDbName}?authSource=${mongoAuthSource}`;

const options = {   
  useNewUrlParser: true,
  useUnifiedTopology: true,
  connectTimeoutMS: 30000,
  socketTimeoutMS: 30000,
  serverSelectionTimeoutMS: 30000,
};

// Connect to MongoDB
await mongoose.connect(MONGO_URI,options); // replace with your MongoDB URI
const Strategy= mongoose.connection.collection('Strategy')

// const strategySchema = new mongoose.Schema({}, { strict: false });
// const Strategy = mongoose.model('Strategy', strategySchema);

const defaultSlOrderId = {
  orderId: "",
  brokerUrl: "",
  clientId: "",
  isDealer: false
};

async function updateStrategies() {
  try {
    const strategies = await Strategy.find().toArray();
    // console.log(strategies);
    
    for (const strategy of strategies) {
      let updated = false;
  
      // Go through log.leg1 to log.leg12
      for (let i = 1; i <= 12; i++) {
        const legKey = `log.leg${i}`;
  
        // Check if log.legX exists
        if (strategy.log && strategy.log[`leg${i}`]) {
          const leg = strategy.log[`leg${i}`];
  
          // If SlOrderId is missing or invalid, set default
          if (!leg.SlOrderId || typeof leg.SlOrderId !== 'object') {
            strategy.log[`leg${i}`].SlOrderId = { ...defaultSlOrderId };
            updated = true;
          }
        }
      }
  
      if (updated) {
        await stg.updateOne(
          { _id: strategy._id },
          { $set: { log: strategy.log } }
        );
        console.log(`Updated strategy: ${strategy._id}`);
      }
    }
  
    console.log("Update complete.");
    await mongoose.disconnect();
    
  } catch (error) {
    console.error("Error updating strategies:", error);
    
  }
}

async function convertFieldsToArray() {
  try {
    // await mongoose.connect(uri);
    // console.log('Connected to MongoDB');

    const strategies = await Strategy.find().toArray();

    for (const strategy of strategies) {
      let updated = false;

      if (strategy.onProfitBooking && !Array.isArray(strategy.onProfitBooking)) {
        strategy.onProfitBooking = [strategy.onProfitBooking];
        updated = true;
      } else if (strategy.onProfitBooking && strategy.onProfitBooking === '') {
        strategy.onProfitBooking = [];
        updated = true;
      }

      if (strategy.onLossBooking && !Array.isArray(strategy.onLossBooking)) {
        strategy.onLossBooking = [strategy.onLossBooking];
        updated = true;
      } else if (strategy.onProfitBooking && strategy.onLossBooking === '') {
        strategy.onLossBooking = [];
        updated = true;
      }

      if (updated) {
        // Use updateOne for raw MongoDB collection update
        await Strategy.updateOne(
          { _id: strategy._id },
          { $set: { onProfitBooking: strategy.onProfitBooking, onLossBooking: strategy.onLossBooking } }
        );
        console.log(`Updated strategy: ${strategy._id}`);
      }
    }

    console.log('Update complete.');
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error during update:', error);
    await mongoose.disconnect();
  }
}

// updateStrategies()
convertFieldsToArray()
