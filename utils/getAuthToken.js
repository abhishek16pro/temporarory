import redisConnect from './redisConnect.js';

const client = redisConnect();

const getAuthToken = async(clientId) => {
  // Retrieve by clientId
  const redisMap = "auth";
  const token = await client.hget(redisMap, String(clientId));
  return token;
}

export default getAuthToken
