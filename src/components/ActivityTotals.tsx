export interface ActivityTotal {
	activity: string;
	sessionCount: number;
	bookingCount: number;
	bookedPlaces: number;
	totalCapacity: number;
	fillRatePct: number;
}

interface Props {
	activities: ActivityTotal[];
}

export default function ActivityTotals({ activities }: Props) {
	return (
		<div className="panel">
			<h2>By Activity</h2>
			<table className="data-table">
				<thead>
					<tr>
						<th>Activity</th>
						<th>Sessions</th>
						<th>Bookings</th>
						<th>Places</th>
						<th>Capacity</th>
						<th>Fill rate</th>
					</tr>
				</thead>
				<tbody>
					{activities.map((activity) => (
						<tr key={activity.activity}>
							<td>{activity.activity}</td>
							<td>{activity.sessionCount}</td>
							<td>{activity.bookingCount}</td>
							<td>{activity.bookedPlaces}</td>
							<td>{activity.totalCapacity}</td>
							<td>{activity.fillRatePct}%</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
