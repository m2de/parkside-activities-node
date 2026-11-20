import Database from "better-sqlite3";
import { beforeAll, describe, expect, it } from "vitest";
import {
	activityTotals,
	bookingsForDay,
	headlineStats,
	scheduleForDay,
} from "./reporting";

let db: Database.Database;

beforeAll(() => {
	db = new Database(":memory:");

	db.exec(`
    CREATE TABLE sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      activity TEXT NOT NULL, date TEXT NOT NULL, start_time TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL, capacity INTEGER NOT NULL);
    CREATE TABLE bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL REFERENCES sessions(id),
      guest_name TEXT NOT NULL, party_size INTEGER NOT NULL,
      status TEXT NOT NULL, created_at TEXT NOT NULL);
  `);

	const insertSession = db.prepare(
		`INSERT INTO sessions (id, activity, date, start_time, duration_minutes, capacity)
     VALUES (?, ?, ?, ?, ?, ?)`,
	);
	insertSession.run(1, "Archery", "2026-03-14", "09:00", 60, 12);
	insertSession.run(2, "Aqua Fit", "2026-03-14", "09:30", 45, 20);
	insertSession.run(3, "Pottery", "2026-03-14", "14:00", 90, 10);
	insertSession.run(4, "Archery", "2026-03-15", "09:00", 60, 12);
	insertSession.run(5, "Pottery", "2026-03-16", "10:00", 90, 10);
	// 2026-03-18: the issue's example — three Archery sessions of ten, 24
	// places sold across several bookings per session — plus a zero-capacity
	// session with no bookings.
	insertSession.run(6, "Archery", "2026-03-18", "09:00", 60, 10);
	insertSession.run(7, "Archery", "2026-03-18", "11:00", 60, 10);
	insertSession.run(8, "Archery", "2026-03-18", "14:00", 60, 10);
	insertSession.run(9, "Climbing", "2026-03-18", "10:00", 60, 0);

	const insertBooking = db.prepare(
		`INSERT INTO bookings (session_id, guest_name, party_size, status, created_at)
     VALUES (?, ?, ?, ?, ?)`,
	);
	insertBooking.run(1, "Alice Brennan", 4, "confirmed", "2026-03-01T10:00:00Z");
	insertBooking.run(1, "Ben Carlisle", 3, "confirmed", "2026-03-02T11:00:00Z");
	insertBooking.run(1, "Cara Dunn", 2, "cancelled", "2026-03-03T12:00:00Z");
	insertBooking.run(1, "Dai Ellis", 5, "confirmed", "2026-03-04T13:00:00Z");
	insertBooking.run(2, "Eve Fraser", 5, "confirmed", "2026-03-05T09:00:00Z");
	insertBooking.run(2, "Finn Gale", 1, "cancelled", "2026-03-06T09:30:00Z");
	insertBooking.run(3, "Gwen Harris", 2, "confirmed", "2026-03-07T14:00:00Z");
	insertBooking.run(4, "Huw Idris", 6, "confirmed", "2026-03-08T08:00:00Z");
	insertBooking.run(5, "Iona Jones", 3, "cancelled", "2026-03-09T10:00:00Z");
	insertBooking.run(6, "Jack King", 4, "confirmed", "2026-03-10T09:00:00Z");
	insertBooking.run(6, "Kim Lewis", 4, "confirmed", "2026-03-10T09:05:00Z");
	insertBooking.run(7, "Liam Moss", 3, "confirmed", "2026-03-10T09:10:00Z");
	insertBooking.run(7, "Mia Nash", 3, "confirmed", "2026-03-10T09:15:00Z");
	insertBooking.run(7, "Noah Owen", 2, "confirmed", "2026-03-10T09:20:00Z");
	insertBooking.run(7, "Olive Park", 2, "cancelled", "2026-03-10T09:25:00Z");
	insertBooking.run(8, "Pip Quinn", 5, "confirmed", "2026-03-10T09:30:00Z");
	insertBooking.run(8, "Rhys Stone", 3, "confirmed", "2026-03-10T09:35:00Z");
});

describe("headlineStats", () => {
	it("totals the sessions running and their combined capacity", () => {
		const stats = headlineStats(db, "2026-03-14");
		expect(stats.sessionCount).toBe(3);
		expect(stats.totalCapacity).toBe(42);
	});

	it("totals the bookings and places booked across the day, ignoring cancellations", () => {
		const stats = headlineStats(db, "2026-03-14");
		expect(stats.bookingCount).toBe(5);
		expect(stats.bookedPlaces).toBe(19);
	});

	it("calculates occupancy from confirmed places as a whole-number percentage of capacity", () => {
		const stats = headlineStats(db, "2026-03-14");
		expect(stats.occupancyPct).toBe(45);
	});

	it("counts cancellations separately", () => {
		const stats = headlineStats(db, "2026-03-14");
		expect(stats.cancelledCount).toBe(2);
	});

	it("averages party size across confirmed bookings only", () => {
		const stats = headlineStats(db, "2026-03-14");
		expect(stats.averagePartySize).toBe(3.8);
	});

	it("returns zero bookings for a day whose only booking was cancelled", () => {
		const stats = headlineStats(db, "2026-03-16");
		expect(stats).toMatchObject({
			sessionCount: 1,
			bookingCount: 0,
			bookedPlaces: 0,
			occupancyPct: 0,
			cancelledCount: 1,
			averagePartySize: 0,
		});
	});

	it("returns zeroed figures for a day with nothing scheduled", () => {
		const stats = headlineStats(db, "2026-03-20");
		expect(stats).toEqual({
			sessionCount: 0,
			totalCapacity: 0,
			bookingCount: 0,
			bookedPlaces: 0,
			occupancyPct: 0,
			cancelledCount: 0,
			averagePartySize: 0,
		});
	});
});

describe("scheduleForDay", () => {
	it("lists the day's sessions in start-time order with their confirmed booking counts", () => {
		const schedule = scheduleForDay(db, "2026-03-14");
		expect(schedule).toEqual([
			expect.objectContaining({
				activity: "Archery",
				start_time: "09:00",
				capacity: 12,
				bookings: 3,
			}),
			expect.objectContaining({
				activity: "Aqua Fit",
				start_time: "09:30",
				capacity: 20,
				bookings: 1,
			}),
			expect.objectContaining({
				activity: "Pottery",
				start_time: "14:00",
				capacity: 10,
				bookings: 1,
			}),
		]);
	});

	it("does not include sessions from other days", () => {
		const schedule = scheduleForDay(db, "2026-03-14");
		expect(
			schedule.find(
				(entry) =>
					entry.activity === "Archery" &&
					entry.start_time === "09:00" &&
					entry.capacity === 12,
			),
		).toBeTruthy();
		expect(schedule).toHaveLength(3);
		expect(scheduleForDay(db, "2026-03-15")).not.toEqual(schedule);
	});

	it("still lists a session whose only booking was cancelled, with zero bookings", () => {
		const schedule = scheduleForDay(db, "2026-03-16");
		expect(schedule).toEqual([
			expect.objectContaining({ activity: "Pottery", bookings: 0 }),
		]);
	});
});

describe("activityTotals", () => {
	it("totals sessions, confirmed bookings and places booked per activity, busiest first", () => {
		const totals = activityTotals(db, "2026-03-14");
		expect(totals).toEqual([
			{
				activity: "Archery",
				sessionCount: 1,
				bookingCount: 3,
				bookedPlaces: 12,
				totalCapacity: 12,
				fillRatePct: 100,
			},
			{
				activity: "Aqua Fit",
				sessionCount: 1,
				bookingCount: 1,
				bookedPlaces: 5,
				totalCapacity: 20,
				fillRatePct: 25,
			},
			{
				activity: "Pottery",
				sessionCount: 1,
				bookingCount: 1,
				bookedPlaces: 2,
				totalCapacity: 10,
				fillRatePct: 20,
			},
		]);
	});

	it("still lists an activity whose only booking was cancelled, with zero totals", () => {
		expect(activityTotals(db, "2026-03-16")).toEqual([
			{
				activity: "Pottery",
				sessionCount: 1,
				bookingCount: 0,
				bookedPlaces: 0,
				totalCapacity: 10,
				fillRatePct: 0,
			},
		]);
	});

	it("fills 80% when three sessions of ten sell 24 places across several bookings each", () => {
		const archery = activityTotals(db, "2026-03-18").find(
			(a) => a.activity === "Archery",
		);
		expect(archery).toEqual({
			activity: "Archery",
			sessionCount: 3,
			bookingCount: 7,
			bookedPlaces: 24,
			totalCapacity: 30,
			fillRatePct: 80,
		});
	});

	it("reports a 0% fill rate for an activity with no capacity and no bookings", () => {
		const climbing = activityTotals(db, "2026-03-18").find(
			(a) => a.activity === "Climbing",
		);
		expect(climbing).toEqual({
			activity: "Climbing",
			sessionCount: 1,
			bookingCount: 0,
			bookedPlaces: 0,
			totalCapacity: 0,
			fillRatePct: 0,
		});
	});

	it("keeps the busiest activity by places first", () => {
		expect(activityTotals(db, "2026-03-18").map((a) => a.activity)).toEqual([
			"Archery",
			"Climbing",
		]);
	});
});

describe("bookingsForDay", () => {
	it("lists bookings ordered by session start time then guest name", () => {
		const bookings = bookingsForDay(db, "2026-03-14");
		expect(bookings.map((b) => b.guest_name)).toEqual([
			"Alice Brennan",
			"Ben Carlisle",
			"Cara Dunn",
			"Dai Ellis",
			"Eve Fraser",
			"Finn Gale",
			"Gwen Harris",
		]);
	});

	it("excludes bookings for sessions on other days", () => {
		const bookings = bookingsForDay(db, "2026-03-14");
		expect(bookings.find((b) => b.guest_name === "Huw Idris")).toBeUndefined();
	});

	it("carries the session's activity and start time through on each row", () => {
		const bookings = bookingsForDay(db, "2026-03-14");
		const alice = bookings.find((b) => b.guest_name === "Alice Brennan");
		expect(alice).toMatchObject({ activity: "Archery", start_time: "09:00" });
	});

	it("includes cancelled bookings alongside confirmed ones", () => {
		const bookings = bookingsForDay(db, "2026-03-14");
		const cara = bookings.find((b) => b.guest_name === "Cara Dunn");
		expect(cara?.status).toBe("cancelled");
	});
});
