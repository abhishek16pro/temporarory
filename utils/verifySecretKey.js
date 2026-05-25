async function verifySecretKey(storedHashedKey, inputKey) {
  const isMatch = await bcrypt.compare(inputKey, storedHashedKey);
  return isMatch;
}
export default verifySecretKey