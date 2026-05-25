import pm2 from "pm2";
import SqoffByClientId from "../sqOff.js";
import ApiResponse from "../../shared/utils/apiResponse.js";

class ApiResult {
      constructor(success, data, message) {
            this.success = success;
            this.data = data;
            this.message = message;
      }
}

const connectPM2 = () => {
      return new Promise((resolve, reject) => {
            pm2.connect((err) => {
                  if (err) {
                        reject(err);
                  } else {
                        resolve();
                  }
            });
      });
};

const disconnectPM2 = () => {
      return new Promise((resolve, reject) => {
            pm2.disconnect((err) => {
                  if (err) {
                        reject(err);
                  } else {
                        resolve();
                  }
            });
      });
};

export const stopTrading = async (req, res) => {
      const processesToStop = ["Execution-Server", "data-feed"];
    
      const stopProcess = (processName) => {
        return new Promise((resolve, reject) => {
          pm2.describe(processName, (err, processDescription) => {
            if (err) {
              reject(
                new Error(`Error describing process ${processName}: ${err.message}`)
              );
            } else if (!processDescription || processDescription.length === 0) {
              resolve(`${processName} not found.`);
            } else {
              pm2.stop(processName, (err) => {
                if (err) {
                  reject(
                    new Error(
                      `${processName} could not be stopped: ${err.message}`
                    )
                  );
                } else {
                  resolve(`${processName} has been stopped successfully.`);
                }
              });
            }
          });
        });
      };
    
      try {
        await connectPM2();
        const stopPromises = processesToStop.map(stopProcess);
        const results = await Promise.allSettled(stopPromises);
    
        const successMessages = results
          .filter((result) => result.status === "fulfilled")
          .map((result) => result.value);
    
        const errorMessages = results
          .filter((result) => result.status === "rejected")
          .map((result) => result.reason.message);
    
        const notFoundMessages = successMessages.filter((message) =>
          message.includes("not found")
        );
        const stoppedMessages = successMessages.filter(
          (message) => !message.includes("not found")
        );
    
        let responseMessage = "";
        if (notFoundMessages.length > 0) {
          responseMessage += `Processes not found:\n${notFoundMessages.join("\n")}\n`;
        }
        if (stoppedMessages.length > 0) {
          responseMessage += `Processes stopped successfully:\n${stoppedMessages.join("\n")}\n`;
        }
        if (errorMessages.length > 0) {
          responseMessage += `Error stopping processes:\n${errorMessages.join("\n")}`;
        }
    
        const apiResponse = new ApiResponse({
          success: errorMessages.length === 0,
          statusCode: errorMessages.length > 0 ? 500 : 200,
          message: responseMessage.trim(),
          data: null,
        });
    
        res.status(apiResponse.statusCode).json(apiResponse.toObject());
      } catch (error) {
        const apiResponse = new ApiResponse({
          success: false,
          statusCode: 500,
          message: `Error stopping processes: ${error.message}`,
          data: null,
        });
        res.status(apiResponse.statusCode).json(apiResponse.toObject());
      } finally {
        try {
          await disconnectPM2();
        } catch (error) {
          console.error(`Error disconnecting PM2: ${error.message}`);
        }
      }
    };

    export const startTrading = async (req, res) => {
      const processesToStart = ["Execution-Server", "data-feed"];
  
      const startProcess = (processName) => {
          return new Promise((resolve, reject) => {
              pm2.describe(processName, (err, processDescription) => {
                  if (err) {
                      reject(
                          new Error(
                              `Error describing process ${processName}: ${err.message}`,
                          ),
                      );
                  } else if (!processDescription || processDescription.length === 0) {
                      resolve(`${processName} not found.`);
                  } else if (processDescription[0].pm2_env.status === "stopped") {
                      pm2.start(processName, (err) => {
                          if (err) {
                              reject(
                                  new Error(
                                      `${processName} could not be started: ${err.message}`,
                                  ),
                              );
                          } else {
                              resolve(`${processName} has been started successfully.`);
                          }
                      });
                  } else {
                      resolve(`${processName} is already running.`);
                  }
              });
          });
      };
  
      try {
          await connectPM2();
          const startPromises = processesToStart.map(startProcess);
          const results = await Promise.allSettled(startPromises);
  
          const successMessages = results
              .filter((result) => result.status === "fulfilled")
              .map((result) => result.value);
  
          const errorMessages = results
              .filter((result) => result.status === "rejected")
              .map((result) => result.reason.message);
  
          const alreadyRunningMessages = successMessages.filter((message) =>
              message.includes("already running"),
          );
          const notFoundMessages = successMessages.filter((message) =>
              message.includes("not found"),
          );
          const startedMessages = successMessages.filter((message) =>
              message.includes("started successfully"),
          );
  
          let responseMessage = "";
          if (alreadyRunningMessages.length > 0) {
              responseMessage += `Processes already running:\n${alreadyRunningMessages.join("\n")}\n`;
          }
          if (notFoundMessages.length > 0) {
              responseMessage += `Processes not found:\n${notFoundMessages.join("\n")}\n`;
          }
          if (startedMessages.length > 0) {
              responseMessage += `Processes started successfully:\n${startedMessages.join("\n")}\n`;
          }
          if (errorMessages.length > 0) {
              responseMessage += `Error starting processes:\n${errorMessages.join("\n")}`;
          }
  
          const response = new ApiResponse({
              success: errorMessages.length === 0,
              statusCode: errorMessages.length > 0 ? 500 : 200,
              message: responseMessage.trim(),
          });
  
          res.status(response.statusCode).json(response.toObject());
      } catch (error) {
          const response = new ApiResponse({
              success: false,
              statusCode: 500,
              message: `Error connecting to PM2: ${error.message}`,
          });
  
          res.status(response.statusCode).json(response.toObject());
      } finally {
          try {
              await disconnectPM2();
          } catch (error) {
              console.error(`Error disconnecting PM2: ${error.message}`);
          }
      }
  };

// export const getSqoffTrading = async (req, res) => {
//   // run the function named sqoff from the file sqoff.js
//   const sqoffResult = await sqoff();
//   const apiResult = new ApiResult(true, sqoffResult, 'Sqoff trading result');
//   res.status(200).json(apiResult);

// };

// getSqoffTrading accepts a array of clientIds and returns the sqoff result for each client

export const getSqoffTrading = async (req, res) => {
    try {
      console.log("IN SQOFF TRADING", req.body);
      
        const clientId = req.body.clientId;
        const sqoffResult = await SqoffByClientId(clientId);

        const response = new ApiResponse({
            success: true,
            statusCode: 200,
            data: sqoffResult,
            message: `Started sqoff trading for ${clientId ? clientId : "all"}`,
        });

        res.status(response.statusCode).json(response.toObject());
    } catch (error) {
        console.error(error);

        const response = new ApiResponse({
            success: false,
            statusCode: 500,
            data: null,
            message: `Error in sqoff trading: ${error.message}`,
        });

        res.status(response.statusCode).json(response.toObject());
    }
};

