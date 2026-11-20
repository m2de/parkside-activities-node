import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

// Resolve the db file relative to the repo root, not the process cwd.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, "..", "parkside.db");

function openSeededDatabase(): Database.Database {
	const notSeeded = `Database not seeded: run \`npm run seed\` first (expected ${dbPath}).`;

	// fileMustExist stops us silently creating an empty, table-less file.
	let database: Database.Database;
	try {
		database = new Database(dbPath, { fileMustExist: true });
	} catch {
		throw new Error(notSeeded);
	}

	const tables = database
		.prepare(
			`SELECT name FROM sqlite_master
			 WHERE type = 'table' AND name IN ('sessions', 'bookings')`,
		)
		.all();
	if (tables.length < 2) {
		database.close();
		throw new Error(notSeeded);
	}

	return database;
}

export const db = openSeededDatabase();

export interface SessionRow {
	id: number;
	activity: string;
	date: string;
	start_time: string;
	duration_minutes: number;
	capacity: number;
}

export interface BookingRow {
	id: number;
	session_id: number;
	guest_name: string;
	party_size: number;
	status: string;
	created_at: string;
}
