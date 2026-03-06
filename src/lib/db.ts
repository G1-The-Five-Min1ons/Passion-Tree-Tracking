import { Pool } from "pg";

let connectionString = process.env.POSTGRES_URL || "";
if (connectionString) {
    try {
        const url = new URL(connectionString);
        url.search = ""; // Remove all query parameters like ?sslmode=require
        connectionString = url.toString();
    } catch (e) {
        // Safe fallback
    }
}

const pool = new Pool({
    connectionString,
    ssl: {
        rejectUnauthorized: false,
    },
});

export default pool;
