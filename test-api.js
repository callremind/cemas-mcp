import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const BASE_URL = process.env.CALLREMIND_API_URL;
const API_KEY = process.env.CALLREMIND_API_KEY;

console.log("--- CallRemind API Connectivity Test ---");
console.log(`URL: ${BASE_URL}`);
console.log(`API Key: ${API_KEY ? API_KEY.substring(0, 8) + "..." : "MISSING"}`);

async function test() {
    try {
        const response = await axios.get(`${BASE_URL}/profile`, {
            headers: { "x-api-key": API_KEY }
        });
        console.log("\n✅ Connection Successful!");
        console.log("Status:", response.status);
        console.log("Data:", JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error("\n❌ Connection Failed!");
        if (error.response) {
            console.error("Status:", error.response.status);
            console.error("Error Detail:", error.response.data);
        } else {
            console.error("Message:", error.message);
        }
    }
}

test();
