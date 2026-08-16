import csv
from pathlib import Path

input_file = "d:/Viksit4Nagpur/0017625-260806074905277.csv"
output_file = "d:/Viksit4Nagpur/cleaned_tiger_data.csv"

# Columns we want to keep
KEEP_COLUMNS = [
    "occurrenceID",
    "decimalLatitude",
    "decimalLongitude",
    "eventDate"
]

with open(input_file, mode="r", encoding="utf-8") as infile, \
     open(output_file, mode="w", encoding="utf-8", newline="") as outfile:
    
    reader = csv.DictReader(infile, delimiter="\t")
    
    # Check if the file is comma-separated instead of tab if header misses
    if "decimalLatitude" not in reader.fieldnames:
        infile.seek(0)
        reader = csv.DictReader(infile, delimiter=",")

    writer = csv.DictWriter(outfile, fieldnames=KEEP_COLUMNS)
    writer.writeheader()
    
    row_count = 0
    for row in reader:
        # Filter only the columns we want
        filtered_row = {col: row.get(col, "") for col in KEEP_COLUMNS}
        writer.writerow(filtered_row)
        row_count += 1

print(f"Successfully cleaned {row_count} rows. Saved to {output_file}")
