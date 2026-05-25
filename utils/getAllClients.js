import account from "../models/account.js";

async function getAllClients() {
  try {
    let clients = await account.find({});
    return clients;
  } catch (error) {
    console.error(error);
  }
}

export default getAllClients;
