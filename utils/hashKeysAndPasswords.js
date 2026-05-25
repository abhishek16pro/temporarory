import bcrypt from "bcrypt";

const hashKeysAndPasswords = async() => {
  const salt = await bcrypt.genSalt();
  const passwordhash = await bcrypt.hash(password, salt);
  return passwordhash
}

export default hashKeysAndPasswords