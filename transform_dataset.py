import csv
import random

input_file = "d:/Viksit4Nagpur/cleaned_tiger_data.csv"
output_file = "d:/Viksit4Nagpur/pench_camera_logs_ready.csv"

# Real Pench Tiger Reserve center coordinates
PENCH_LAT_OFFSET = -8.2  # Shift from 29.9 to ~21.7
PENCH_LON_OFFSET = 1.2   # Shift from 78.2 to ~79.4

TIGER_IDS = ["PTR-T01", "PTR-T02", "PTR-T03", "PTR-T04", "PTR-T05", "PTR-T06"]
FLANKS = ["Left", "Right"]
STATIONS = [f"ST-{str(i).zfill(2)}" for i in range(1, 21)]  # ST-01 to ST-20

OUTPUT_COLUMNS = [
    "station_id",
    "timestamp",
    "latitude",
    "longitude",
    "tiger_id",
    "flank_side"
]

with open(input_file, mode="r", encoding="utf-8") as infile, \
     open(output_file, mode="w", encoding="utf-8", newline="") as outfile:
    
    reader = csv.DictReader(infile)
    writer = csv.DictWriter(outfile, fieldnames=OUTPUT_COLUMNS)
    writer.writeheader()
    
    for row in reader:
        try:
            # Shift coordinates mathematically
            orig_lat = float(row["decimalLatitude"])
            orig_lon = float(row["decimalLongitude"])
            
            # Add a tiny bit of random noise so they aren't perfectly grid-aligned
            new_lat = orig_lat + PENCH_LAT_OFFSET + random.uniform(-0.05, 0.05)
            new_lon = orig_lon + PENCH_LON_OFFSET + random.uniform(-0.05, 0.05)
            
            # To make it realistic, tigers should stay somewhat in their own territories.
            # We use modulo math based on longitude to assign tigers geographically
            geo_hash = int(new_lon * 100) % len(TIGER_IDS)
            tiger_id = TIGER_IDS[geo_hash]
            
            # Assign a random station ID based on location hash
            station_id = STATIONS[int(new_lat * 100) % len(STATIONS)]

            new_row = {
                "station_id": station_id,
                "timestamp": row["eventDate"],
                "latitude": round(new_lat, 5),
                "longitude": round(new_lon, 5),
                "tiger_id": tiger_id,
                "flank_side": random.choice(FLANKS)
            }
            writer.writerow(new_row)
        except ValueError:
            # Skip rows with missing or invalid coordinates
            continue

print(f"Dataset completely transformed! Saved to {output_file}")
