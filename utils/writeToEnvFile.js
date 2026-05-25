import { writeFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// const writeToEnvFile = async(envKey,envValue) => {
//   // Get the current directory
//   const __filename = fileURLToPath(import.meta.url);
//   console.log(__filename);
  
//   const __dirname = dirname(__filename);
//   console.log(__dirname);
  
  
//   // Define the path to the .env file (current directory)
//   const envFilePath = join(__dirname, '.env');
  
//   // Define the content for the .env file
//   // const envValue = 'your_encryption_key_value';
//   const envContent = `${envKey}=${envValue}\n`;
  
//   // Write to the .env file
//   try {
//       await writeFile(envFilePath, envContent, { flag: 'w' }); // flag 'w' for overwrite
//       console.log('.env file created/updated successfully.');
//   } catch (err) {
//       console.error('Error writing to .env file:', err);
//   }
// }

export default function writeToEnvFile(envPath, key, value) {
  const env = fs.readFileSync(envPath).toString().split("\n");
  let keyExists = false;
  const newEnv = env.map((line) => {
      if (line.split("=")[0] === key) {
          keyExists = true;
          return `${key}=${value}`;
      }
      return line;
  });
  if (!keyExists) {
      newEnv.push(`${key}=${value}`);
  }
  fs.writeFileSync(envPath, newEnv.join("\n"));
}

