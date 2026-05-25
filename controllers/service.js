import { exec } from 'child_process';

let allowedPM2Processes = ['SYNC-POS', 'WEBSOCKET-MD'];

// POST API to start a specific PM2 process by name
export async function startPM2Process(req, res) {
    const { pm2Name } = req.body;
    if (!pm2Name) {
        return res.status(400).json({ success: false, message: 'pm2Name is required in payload' });
    }
    if (!allowedPM2Processes.includes(pm2Name)) {
        return res.status(400).json({ success: false, message: `Starting PM2 process '${pm2Name}' is not allowed` });
    }
    exec(`pm2 start ${pm2Name}`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error starting PM2 process '${pm2Name}': ${error}`);
            return res.status(500).json({ success: false, message: `Failed to start PM2 process '${pm2Name}'`, error: error.message });
        }
        res.json({ success: true, message: `PM2 process '${pm2Name}' started`, stderr });
    });
};

// POST API to stop a specific PM2 process by name
export async function stopPM2Process(req, res) {
    const { pm2Name } = req.body;
    if (!pm2Name) {
        return res.status(400).json({ success: false, message: 'pm2Name is required in payload' });
    }
    if (!allowedPM2Processes.includes(pm2Name)) {
        return res.status(400).json({ success: false, message: `Stopping PM2 process '${pm2Name}' is not allowed` });
    }
    exec(`pm2 stop ${pm2Name}`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error stopping PM2 process '${pm2Name}': ${error}`);
            return res.status(500).json({ success: false, message: `Failed to stop PM2 process '${pm2Name}'`, error: error.message });
        }
        res.json({ success: true, message: `PM2 process '${pm2Name}' stopped`, stderr });
    });
};

// GET API to list all PM2 processes
export async function getPM2Processes(req, res) {
    exec('pm2 jlist', (error, stdout, stderr) => {
        if (error) {
            console.error(`Error fetching PM2 list: ${error}`);
            return res.status(500).json({ success: false, message: 'Failed to fetch PM2 list', error: error.message });
        }
        try {
            const processList = JSON.parse(stdout);
            const result = processList.map(proc => ({
                id: proc.pm_id,
                name: proc.name,
                status: proc.pm2_env.status,
                uptime: proc.pm2_env.uptime,
                cpu: proc.monit.cpu
            }));
            res.json({ success: true, processes: result });
        } catch (parseError) {
            res.status(500).json({ success: false, message: 'Failed to parse PM2 list', error: parseError.message });
        }
    });
}