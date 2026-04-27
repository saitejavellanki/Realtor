const { spawn } = require('child_process');
const path = require('path');

// Get ngrok from system or use alternative approach
async function startTunnel() {
    try {
        // Try using ngrok from command line
        const ngrok = spawn('ngrok', ['http', '3011']);

        ngrok.stdout.on('data', (data) => {
            console.log(`${data}`);
        });

        ngrok.stderr.on('data', (data) => {
            console.error(`${data}`);
        });

        ngrok.on('close', (code) => {
            console.log(`ngrok process exited with code ${code}`);
        });
    } catch (error) {
        console.error('ngrok not found. Download from: https://ngrok.com/download');
        console.log('\nAlternative: Use Expose.sh or LocalTunnel:');
        console.log('npx localtunnel --port 3011');
    }
}

startTunnel();
