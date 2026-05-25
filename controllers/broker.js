import brokerList from "../models/brokerList.js";
import ApiResponse from "../../shared/utils/apiResponse.js";
import account from "../models/account.js";

export const getBrokerList = async (req, res) => {
      let brokerListArr = [];
      try {
            brokerListArr = await brokerList.find({}, { _id: 0, brokerName: 1 , mappedClient: 1  });
            return res.send(
                  new ApiResponse({
                        success: true,
                        statusCode: 200,
                        data: brokerListArr,
                        message: "Broker List",
                  }).toObject(),
            );
      } catch (error) {
            return res.send(
                  new ApiResponse({
                        success: false,
                        statusCode: 400,
                        data: brokerListArr,
                        message: "Broker List",
                  }).toObject(),
            );
      }
};

export const addBroker = async (req, res) => {
      const { brokerName, brokerUrl } = req.body;
      try {
            const broker = new brokerList({
                  brokerName,
                  brokerUrl,
                  mappedClient: [],
            });
            let urlRegex = new RegExp(
                  "^(https?:\\/\\/)?([\\w\\d-]+\\.)+[\\w\\d-]{2,}(\\:\\d+)?(\\/.*)?$"
                );
            if (!urlRegex.test(brokerUrl)) {
                  return res.send(
                        new ApiResponse({
                              success: false,
                              statusCode: 400,
                              data: {},
                              message: "Invalid URL",
                        }).toObject(),
                  );
            }
            // check if broker already exists
            const brokerExists = await brokerList.findOne({}).where("brokerName").equals(brokerName);
            if (brokerExists) {
                  return res.send(
                        new ApiResponse({
                              success: false,
                              statusCode: 400,
                              data: {},
                              message: "Broker Already Exists",
                        }).toObject(),
                  );
            }
            
            await broker.save();
            return res.send(
                  new ApiResponse({
                        success: true,
                        statusCode: 201,
                        data: broker,
                        message: "Broker Added",
                  }).toObject(),
            );
      } catch (error) {
            return res.send(
                  new ApiResponse({
                        success: false,
                        statusCode: 400,
                        data: {},
                        message: "Broker Not Added",
                  }).toObject(),
            );
      }
};

export const verifyClient = async (req, res) => {
      const { brokerName } = req.query;
      const brokerNameT = brokerName.replace(/\s/g, "").toString();

      let clientList = [];
      try {
            clientList = await account.find({ brokerName: brokerNameT }, { _id: 0, userId: 1 });

            for (const client of clientList) {
                  const brokerData = await brokerList.findOne({ brokerName: brokerNameT });
                  if (!brokerData) {
                        console.log(`Broker with name ${brokerNameT} not found.`);
                        return res.send(
                              new ApiResponse({
                                    success: false,
                                    statusCode: 404,
                                    message: `Broker with name ${brokerNameT} not found.`,
                              }).toObject(),
                        );
                  }

                  const isClientMapped = brokerData.mappedClient.some(
                        (clientMapping) => clientMapping.clientId === client.userId,
                  );

                  if (isClientMapped) {
                        return res.send(
                              new ApiResponse({
                                    success: false,
                                    statusCode: 400,
                                    message: `Client ${client.userId} is already mapped to broker ${brokerNameT}.`,
                              }).toObject(),
                        );
                  }

                  const objForMappedClient = {
                        clientId: client.userId,
                        isMapped: true,
                  };

                  await brokerList.findOneAndUpdate(
                        { brokerName: brokerNameT },
                        { $push: { mappedClient: objForMappedClient } },
                        { new: true },
                  );
                  console.log(`Client ${client.userId} added to broker ${brokerNameT}.`);
            }

            return res.send(
                  new ApiResponse({
                        success: true,
                        statusCode: 200,
                        data: clientList,
                        message: "Client List updated successfully.",
                  }).toObject(),
            );
      } catch (error) {
            return res.send(
                  new ApiResponse({
                        success: false,
                        statusCode: 400,
                        data: clientList,
                        message: "Error updating client list.",
                  }).toObject(),
            );
      }
};
