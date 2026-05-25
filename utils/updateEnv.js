import fs from 'fs';
import path from 'path';
import crypto from "crypto";
function bfsFindDir(startDir){
    const queue = [startDir];
    while(queue.length){
        const dir = queue.shift();
        const files = fs.readdirSync(dir);
        for(let file of files){
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);
            if(stat.isDirectory()){
                queue.push(filePath);
            } else if(file === '.env'){
                return filePath;
            }
        }
    }
    return null;
}

async function updateEnv(key, value){
    const startDir = process.cwd();
    const envPath = bfsFromSubFiletoRoot(startDir);
    if(!envPath){
        console.error('.env file not found');
        return;
    }
    const env = fs.readFileSync(envPath).toString().split("\n");
    let keyExists = false;
    const newEnv = env.map((line) => {
        if(line.split("=")[0] === key){
            keyExists = true;
            return `${key}=${value}`;
        }
        return line;
    });
    if(!keyExists){
        newEnv.push(`${key}=${value}`);
    }
    fs.writeFileSync(envPath, newEnv.join("\n"));
}

function bfsFromSubFiletoRoot(currDir){
    let dir = currDir;
    let root = path.parse(dir).root;
    while(dir !== root){
        const files = fs.readdirSync(dir);
        if(files.includes('.env')){
            return path.join(dir, '.env');
        }
        dir = path.dirname(dir);
    }
}

export default updateEnv;