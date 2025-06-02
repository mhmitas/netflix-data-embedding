import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set. Please check your .env file.');
}

const pool = new Pool({
    connectionString: connectionString,
    ssl: {
        rejectUnauthorized: false
    }
});

pool.on('connect', () => {
    console.log('PostgreSQL Pool: Connected to database!');
});

pool.on('error', (err: any) => {
    console.error('PostgreSQL Pool Error:', err.message, err.stack);
});

/**
 * Executes a SQL query.
 * @param {string} query The SQL query string.
 * @param {Array<any>} [params=[]] Optional: An array of values to safely insert into the query.
 * @returns {Promise<Array<any>>} A promise that resolves to an array of rows (data).
 */
interface SqlQueryResultRow {
    [column: string]: any;
}

interface SqlFunction {
    (query: string, params?: any[]): Promise<SqlQueryResultRow[]>;
}

const sql: SqlFunction = async function (
    query: string,
    params: any[] = []
): Promise<SqlQueryResultRow[]> {
    const client = await pool.connect();
    try {
        const result = await client.query(query, params);
        return result.rows;
    } finally {
        client.release();
    }
};

export { sql };
