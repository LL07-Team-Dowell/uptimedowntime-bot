import { Client, GatewayIntentBits } from 'discord.js';
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds]
});

const TOKEN = process.env.TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;

const HealthCheckLinks = [
    { url: "https://100090.pythonanywhere.com/", product: "Test" },
    { url: "https://100085.pythonanywhere.com/", product: "Email" },
    { url: "https://100105.pythonanywhere.com/", product: "Credit System" },
    { url: "https://www.qrcode.uxlivinglab.online/", product: "Fridge" },
    { url: "https://www.scales.uxlivinglab.online/api/", product: "Scale" },
    { url: "https://www.scales.uxlivinglab.online/services/", product: "Scale" },
    { url: "https://www.uxlive.me/samanta-campaigns/", product: "Samanta Campaign" },
    { url: "https://www.dowelldatacube.uxlivinglab.online/db_api/health_check/", product: "Datacube API V1" },
    { url: "https://100045.pythonanywhere.com/", product: "Secure Repository" },
    { url: "https://100009.pythonanywhere.com/", product: "DoWell Clock" },
    { url: "https://100080.pythonanywhere.com/", product: "Legalzard" },
    { url: "https://100098.pythonanywhere.com/", product: "Team Management" },
    { url: "https://100074.pythonanywhere.com/health-check/", product: "Dowell Location" },
    { url: "https://liveuxstoryboard.com/health-check", product: "Logo Scan" },
    { url: "https://datacube.uxlivinglab.online/health_check/", product: "Datacube V2" },
    { url: "https://www.dowellcube.uxlivinglab.online/api/v1/self", product: "DoWell Cube" },
];

// Add timeout to axios requests
const axiosInstance = axios.create({
    timeout: 10000 // 10 seconds timeout
});

async function checkHealth({ url, product }) {
    console.log(`Checking health for ${product} at ${url}...`);
    try {
        const response = await axiosInstance.get(url);
        if (response.status === 200) {
            console.log(`✅ ${product} is healthy.`);
            return { product, status: "✅ Healthy" };
        } else {
            console.warn(`⚠️ ${product} returned status ${response.status}.`);
            return { product, status: "⚠️ Not Healthy" };
        }
    } catch (error) {
        const errorMessage = error.code === 'ECONNABORTED' 
            ? '❌ Timeout' 
            : '❌ Unreachable';
        console.error(`${errorMessage} - ${product}. Error: ${error.message}`);
        return { product, status: errorMessage };
    }
}

async function checkAllHealthLinks() {
    console.log('Starting health checks for all links...');
    try {
        const results = await Promise.all(HealthCheckLinks.map(checkHealth));
        console.log('All health checks completed:', results);
        return results;
    } catch (error) {
        console.error('Error in checkAllHealthLinks:', error);
        return HealthCheckLinks.map(link => ({
            product: link.product,
            status: '❌ Check Failed'
        }));
    }
}

function generateReport(results) {
    const timeChecked = new Date().toLocaleString();
    console.log('Generating report...');

    let report = "```diff\n";  
    report += "+" + "═".repeat(50) + "\n";
    report += "+          🏥 HEALTH CHECK REPORT 🏥\n";
    report += "+" + "═".repeat(50) + "\n\n";

    report += `⏰ Time: ${timeChecked}\n`;
    report += `📊 Services Monitored: ${results.length}\n`;

    const healthyCount = results.filter(r => r.status.includes("✅")).length;
    const warningCount = results.filter(r => r.status.includes("⚠️")).length;
    const errorCount = results.filter(r => r.status.includes("❌")).length;

    report += `\n📈 Summary:\n`;
    report += `   ✅ Healthy: ${healthyCount}\n`;
    report += `   ⚠️ Warnings: ${warningCount}\n`;
    report += `   ❌ Errors: ${errorCount}\n`;

    report += "\n" + "─".repeat(50) + "\n";
    report += "   SERVICE              │      STATUS          \n";
    report += "═".repeat(50) + "\n";

    results.forEach(({ product, status }) => {
        const paddedProduct = product.slice(0, 18).padEnd(20);
        const paddedStatus = status.padEnd(20);

        if (status.includes("✅")) {
            report += `+  ${paddedProduct} │ ${paddedStatus}\n`;
        } else if (status.includes("⚠️")) {
            report += `-  ${paddedProduct} │ ${paddedStatus}\n`;
        } else {
            report += `!  ${paddedProduct} │ ${paddedStatus}\n`;
        }
    });

    report += "─".repeat(50) + "\n";
    report += `\n🔄 Next check: In 1 hour\n`;
    report += "═".repeat(50) + "\n";
    report += "```";

    console.log('Report generated successfully.');
    return report;
}

// Keep track of the interval
let healthCheckInterval = null;

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);

    async function performHealthCheck() {
        console.log('Performing health check...');
        try {
            const channel = await client.channels.fetch(CHANNEL_ID);
            if (!channel) {
                console.error('Could not find the specified channel. Check CHANNEL_ID.');
                return;
            }

            console.log('Channel fetched successfully.');
            const healthResults = await checkAllHealthLinks();
            const report = generateReport(healthResults);

            console.log('Sending report to channel...');
            await channel.send(report);
            console.log('Health check report sent successfully!');
        } catch (error) {
            console.error('Error performing health check:', error.message);
            // If there's an error with the Discord client, attempt to reconnect
            if (error.code === 'ECONNRESET' || error.code === 'DISCONNECTED') {
                console.log('Attempting to reconnect...');
                try {
                    await client.destroy();
                    await client.login(TOKEN);
                } catch (loginError) {
                    console.error('Failed to reconnect:', loginError.message);
                }
            }
        }
    }

    // Clear any existing interval
    if (healthCheckInterval) {
        clearInterval(healthCheckInterval);
    }

    // Perform the first health check immediately
    await performHealthCheck();

    // Schedule health checks every 5 minutes
    healthCheckInterval = setInterval(performHealthCheck, 3600000);
});

// Handle disconnections
client.on('disconnect', () => {
    console.log('Bot disconnected! Attempting to reconnect...');
    if (healthCheckInterval) {
        clearInterval(healthCheckInterval);
    }
    client.login(TOKEN);
});

// Handle errors
client.on('error', async error => {
    console.error('Discord client error:', error.message);
    if (healthCheckInterval) {
        clearInterval(healthCheckInterval);
    }
    try {
        await client.destroy();
        await client.login(TOKEN);
    } catch (loginError) {
        console.error('Failed to reconnect after error:', loginError.message);
    }
});

process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});

client.login(TOKEN).catch(error => {
    console.error('Failed to login to Discord:', error.message);
});