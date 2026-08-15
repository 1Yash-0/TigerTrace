Implementation plan: offline tiger camera-trap intelligence system

You have the right starting point, but one correction matters: MDV6 detects “animal/person/vehicle”, not “tiger” or individual tigers. Use it for high-recall blank filtering and animal localization, then build a separate tiger classifier and stripe re-identification model on top.

The safest architecture is:
Raw SD-card folders
        ↓
1. Inventory + hashing + metadata extraction
        ↓
2. Blank/animal/person/vehicle detection with MDV6
        ↓
3. Reversible quarantine of probable blanks
        ↓
4. Tiger species classification
        ↓
5. Tiger box validation and flank/body crop generation
        ↓
6. Stripe embedding model + nearest-neighbor retrieval
        ↓
7. Confidence calibration + human review
        ↓
8. Persistent SQLite database
        ↓
9. Station/GPS normalization and survey-effort analysis
        ↓
10. Occupancy maps + movement alerts + audit reports

---
1. Freeze the project assumptions first

Create this file:
E:\Chaos\Hackathons\VNIT\PROJECT_CONFIG.md


Write down:
Project: Pench Tiger Reserve Camera-Trap Intelligence
Primary species: Bengal tiger
Training dataset: ATRW, Amur tiger
Inference: offline CPU-only laptop
Fine-tuning hardware: RTX 4060 / Kaggle GPU
Input: raw camera-trap image folders
Original data must never be deleted
All automatic decisions must be reversible
Ambiguous identities must go to human review


Also record:
Python version
PyTorch version
ONNX Runtime version
CUDA version
GPU model
MDV6 checkpoint filename
ATRW download source
Git commit hashes of all repositories


Create:
E:\Chaos\Hackathons\VNIT\environment.yml
E:\Chaos\Hackathons\VNIT\requirements-lock.txt
E:\Chaos\Hackathons\VNIT\RUNBOOK.md
E:\Chaos\Hackathons\VNIT\LICENSES.md


Do not keep changing package versions casually. Wildlife pipelines often break because the detector, CUDA runtime, and ONNX exporter silently disagree.
---
2. Expand the directory structure

Your current structure is a good start. Expand it before writing model code:
E:\Chaos\Hackathons\VNIT\
│
├── data\
│   ├── raw\                       # Never modify or delete
│   │   ├── atrw\
│   │   └── pench_runs\
│   │       ├── run_001\
│   │       └── run_002\
│   │
│   ├── atrw\
│   │   ├── detection\
│   │   ├── pose\
│   │   ├── reid\
│   │   └── manifests\
│   │
│   ├── interim\
│   │   ├── inventory\
│   │   ├── mdv6_predictions\
│   │   ├── crops\
│   │   ├── embeddings\
│   │   └── metadata_normalized\
│   │
│   ├── processed\
│   │   ├── blank\
│   │   ├── animal\
│   │   ├── tiger\
│   │   ├── human\
│   │   ├── uncertain\
│   │   └── quarantine\
│   │
│   ├── splits\
│   │   ├── detection\
│   │   ├── tiger_classification\
│   │   ├── reid\
│   │   └── local_pench_validation\
│   │
│   └── reports\
│
├── models\
│   ├── pretrained\
│   │   ├── MDV6-mit-yolov9-c.ckpt\
│   │   ├── MDV6-yolov9-c.pt\
│   │   ├── MDV6-yolov9-c.onnx\
│   │   ├── config_v9c.yaml\
│   │   ├── atrw_baseline_reid.pth\
│   │   └── tiger_classifier.pth\
│   │
│   ├── checkpoints\
│   │   ├── detector\
│   │   ├── classifier\
│   │   └── reid\
│   │
│   └── exported\
│       ├── detector\
│       ├── classifier\
│       └── reid\
│
├── src\
│   ├── config.py
│   ├── logging_utils.py
│   │
│   ├── ingest\
│   │   ├── inventory.py
│   │   ├── hashing.py
│   │   ├── metadata_parser.py
│   │   ├── timestamp_normalizer.py
│   │   └── station_mapper.py
│   │
│   ├── detection\
│   │   ├── mdv6_inference.py
│   │   ├── prediction_parser.py
│   │   ├── blank_policy.py
│   │   └── crop_generator.py
│   │
│   ├── classification\
│   │   ├── tiger_classifier.py
│   │   ├── train_classifier.py
│   │   └── calibrate_classifier.py
│   │
│   ├── reid\
│   │   ├── dataset.py
│   │   ├── augmentations.py
│   │   ├── backbone.py
│   │   ├── losses.py
│   │   ├── train_reid.py
│   │   ├── embed.py
│   │   ├── retrieve.py
│   │   └── thresholds.py
│   │
│   ├── database\
│   │   ├── schema.sql
│   │   ├── db.py
│   │   ├── migrations.py
│   │   └── queries.py
│   │
│   ├── analytics\
│   │   ├── occupancy.py
│   │   ├── home_range.py
│   │   ├── survey_effort.py
│   │   ├── deviation_alerts.py
│   │   └── confidence.py
│   │
│   ├── maps\
│   │   ├── static_map.py
│   │   ├── interactive_map.py
│   │   └── exports.py
│   │
│   └── pipeline\
│       ├── run_pipeline.py
│       ├── resume.py
│       ├── validation.py
│       └── report.py
│
├── app\
│   ├── review_ui.py
│   ├── dashboard.py
│   └── assets\
│
├── configs\
│   ├── default.yaml
│   ├── cpu.yaml
│   ├── gpu_training.yaml
│   └── paths_windows.yaml
│
├── scripts\
│   ├── 01_inventory.py
│   ├── 02_run_mdv6.py
│   ├── 03_build_crops.py
│   ├── 04_train_classifier.py
│   ├── 05_train_reid.py
│   ├── 06_export_onnx.py
│   ├── 07_run_pipeline.py
│   └── 08_evaluate.py
│
├── notebooks\
│   ├── 01_atrw_exploration.ipynb
│   ├── 02_detection_visualization.ipynb
│   ├── 03_reid_embeddings.ipynb
│   └── 04_error_analysis.ipynb
│
└── outputs\
    ├── runs\
    ├── logs\
    ├── maps\
    ├── review_exports\
    └── reports\


The source images should stay untouched. Every processed copy must be traceable back to its original path and hash.
---
3. Set up the Python environment

Use a dedicated environment, not your global Python installation.

Recommended first environment:
Python 3.10 or 3.11
PyTorch with CUDA for training
ONNX Runtime GPU for testing
ONNX Runtime CPU for deployment
OpenCV
Pillow
numpy
pandas
scikit-learn
scipy
pyyaml
tqdm
SQLAlchemy
sqlite-utils
pyarrow
shapely
geopandas
folium
plotly
streamlit
rich
piexif
imagehash


Use separate dependency groups conceptually:
Training:
torch
torchvision
timm
albumentations
pytorch-metric-learning
faiss-cpu or hnswlib

Inference:
onnxruntime
opencv-python
Pillow
numpy
pandas

Mapping:
geopandas
shapely
folium
rasterio only if you later need raster layers

Application:
streamlit


For final laptop deployment, install CPU ONNX Runtime separately. Do not assume a PyTorch CUDA environment represents the field machine.

Verify:
GPU training works
CPU PyTorch works
ONNX CPU inference works
OpenCV can read JPEG/PNG/TIFF
SQLite can create and query a database


Create a tiny test script that loads one image and runs each exported model before processing the full dataset.
---
4. Validate the ATRW dataset before training

Do not immediately train. First create a dataset audit.

The ATRW source contains separate detection, pose, and re-identification portions. Its re-ID data is valuable because it contains repeated identity labels, but it is not equivalent to Pench camera-trap data. The official material describes more than 8,000 clips from 92 Amur tigers, with approximately 9,500 boxes, pose keypoints, and roughly 3,600 identity-labelled boxes.

Your audit must answer:
How many actual image files exist?
How many annotations exist?
How many unique identity IDs exist?
How many images per identity?
Are the images extracted video frames?
Are near-duplicate frames present?
Are train and test frames from the same video clip?
Are left and right flanks identified?
Are identity labels per image or per box?
Are pose coordinates normalized or pixel-based?
Are bounding boxes xyxy, xywh, or another format?
Are image filenames unique?


Create:
data\atrw\manifests\atrw_all.csv
data\atrw\manifests\atrw_identity_summary.csv
data\atrw\manifests\atrw_duplicate_report.csv


Recommended manifest columns:
image_id
absolute_path
relative_path
split
source_track
clip_id
frame_id
identity_id
bbox_x1
bbox_y1
bbox_x2
bbox_y2
bbox_width
bbox_height
image_width
image_height
keypoints_json
pose_visibility
flank_side
source_url
sha256
perceptual_hash


Generate contact sheets for:
20 random identities
the identities with the fewest images
the identities with the most images
front-facing views
side-facing views
occluded views
night/dark views
small tiger boxes
multiple-tiger images


This step will expose whether the labels are actually usable before you waste GPU time.
---
5. Build the immutable image inventory

For every image, record:
absolute path
relative path
filename
extension
file size
SHA-256 hash
perceptual hash
width
height
EXIF timestamp
filesystem modified timestamp
filename timestamp
parent folder
possible station ID
possible camera ID
possible sequence ID
corrupt/readable status


Why both SHA-256 and perceptual hash?
• SHA-256 finds exact duplicates.
• Perceptual hash finds resized or recompressed duplicates.
• Camera-trap bursts often contain near-identical frames that can create fake performance.

Do not infer that a file is blank from file size. A dark tiger image can be large; a blank image can also be large.

Use a SQLite or Parquet inventory rather than a massive CSV if the dataset becomes large.

Initial statuses:
unprocessed
read_error
candidate_blank
candidate_animal
candidate_human
candidate_vehicle
candidate_uncertain
processed
review_required


The original inventory is the audit trail.
---
6. Parse camera metadata robustly

The input folders will be messy, so metadata extraction must be probabilistic and auditable.

Extract timestamps in this order:
1. Embedded EXIF DateTimeOriginal.
2. Camera filename timestamp.
3. Folder-level date.
4. Filesystem timestamp only as a last resort.
5. If none exist, mark timestamp as unknown.

Never silently overwrite the original timestamp. Store:
timestamp_original
timestamp_normalized
timestamp_source
timestamp_confidence
clock_offset_applied


For station identification, look for:
camera001
cam_01
station_17
Pench_G4_C12
Grid_23
DSC_0001


Keep:
station_raw
station_normalized
station_mapping_confidence


Create a manual mapping file:
data\interim\metadata_normalized\station_mapping.csv


Example:
raw_folder,normalized_station,gps_lat,gps_lon,region,core_or_buffer,source,confidence
CAM_17,ST_017,21.XXXX,79.XXXX,core,core,field_map,high


If GPS is unavailable in the image, do not predict it from pixels. Use a station lookup table. Visual geolocation is too unreliable for management alerts.
---
7. Run MDV6 as the first-pass detector

Use MDV6 for:
animal detection
person detection
vehicle detection
blank filtering
rough bounding-box localization


Do not use it as the final tiger classifier.

The MDV6 result should be saved as JSON, not only copied into folders. Store:
image_id
detector_name
detector_version
model_checksum
class_name
confidence
x1
y1
x2
y2
inference_time_ms
image_width
image_height


Keep the original detector output unchanged:
data\interim\mdv6_predictions\run_001_raw.json


Then create a normalized prediction table for your own code.

Recommended initial policy:
animal confidence >= 0.20:
    retain for animal/tiger analysis

person confidence >= 0.20:
    retain in privacy-review queue

vehicle confidence >= 0.20:
    retain as non-tiger event

no detections:
    candidate blank, not automatically deleted

very low-confidence detection:
    uncertain, not deleted


The threshold should favor recall. In this project, a false blank is more damaging than keeping an extra image.

Use separate thresholds for:
animal detection
person detection
vehicle detection
blank quarantine
automatic identity assignment


Do not use one global confidence threshold for everything.
---
8. Design the reversible blank policy

Never delete the original image.

Use these folders:
processed\blank\
processed\animal\
processed\human\
processed\uncertain\
processed\quarantine\


Better still, use a manifest-driven quarantine rather than moving files. The application can show blank images as excluded while the original stays in place.

Recommended blank logic:
If no MDV6 detection:
    candidate_blank

If image is extremely dark:
    candidate_blank_dark

If image is blurred:
    candidate_blank_blur

If image has strong compression or obstruction:
    candidate_uncertain

If animal confidence is close to threshold:
    candidate_uncertain

If person is detected:
    candidate_human

If animal is detected:
    candidate_animal


Use a three-level decision:
AUTO_EXCLUDE:
    no detections, strong blank evidence, low risk

REVIEW:
    low-confidence animal, darkness, blur, obstruction, ambiguous detector result

KEEP:
    animal/person/vehicle detected confidently


For every decision save:
decision
decision_reason
confidence
model_version
decision_timestamp
review_status
reviewer


The first evaluation metric is not “how many blanks were removed.” It is:
false blank rate = animal-containing images incorrectly classified as blank


Set an extremely low false blank target before optimizing speed.
---
9. Build a blank-image validation set

ATRW is not enough for blank filtering because it contains tiger-focused data, not the full mess of raw camera-trap triggers.

Create a local validation set with at least:
500 genuine blanks
200 grass/leaf triggers
100 rain or water droplets
100 insects
100 heat shimmer or glare
100 night-dark images
100 humans
100 vehicles
200 non-tiger animals
200 tiger-containing images


If you cannot label that many immediately, start with 100 per important category, but the final evaluation should be larger.

Label each image:
blank
animal_non_tiger
tiger
human
vehicle
multiple_subjects
unusable
uncertain


The blank filter is allowed to be conservative. It should send difficult images to review instead of deleting them.
---
10. Train a tiger-versus-non-tiger classifier

MDV6 says “animal,” not “tiger.” You need a species stage.

Start with a compact model:
MobileNetV3-Large
EfficientNet-Lite0
ResNet-18


Recommended first choice:
MobileNetV3-Large, input 224 x 224


Why:
• small model;
• fast CPU inference;
• easy ONNX export;
• sufficient for tiger versus non-tiger classification;
• less expensive than using the re-ID model on every animal.

Classes:
tiger
other_animal
human
vehicle
uncertain


You can omit human and vehicle if MDV6 already handles them reliably, but including them can help the classifier reject confusing detections.

Important: train on crops, not only full images. Use:
detector box + 10% to 20% padding


Preserve aspect ratio with letterboxing. Do not stretch tiger bodies.

Augment with:
brightness changes
contrast changes
mild blur
JPEG compression
random crop
horizontal flip
small rotations
rain-like occlusion
night darkening


Do not use aggressive transformations that destroy stripe geometry.

Split by capture sequence, not random frame. Near-identical burst frames must stay in the same split.
---
11. Prepare ATRW re-identification data correctly

The key mistake to avoid is treating each identity as a normal classification class. Your final system must support new tigers, so it needs embeddings, not only a fixed softmax classifier.

Create training samples:
anchor image
positive image of same tiger
negative image of different tiger


But avoid easy negatives only. Create hard negatives from:
similar stripe density
similar body color
same pose
same camera angle
same lighting
same crop size
same side of body


Use identity-aware splits:
train identities
validation identities
test identities


Also create a stricter split:
train clips
validation clips
test clips


Never allow adjacent frames from the same video clip across train and test.

If a clip contains many near-identical frames, sample only a limited number per clip per epoch. Otherwise the model memorizes video appearance instead of stripe identity.

Recommended sample manifest:
sample_id
image_path
identity_id
clip_id
bbox
flank_side
pose_path
quality_score
split

---
12. Use a two-stage re-ID design

Your final re-ID system should be:
tiger crop
   ↓
quality check
   ↓
flank/body crop
   ↓
embedding model
   ↓
normalized embedding vector
   ↓
nearest-neighbor search
   ↓
confidence calibration
   ↓
known ID, unknown ID, or human review


Do not begin with a closed-set classifier that outputs only the 92 ATRW IDs. Those IDs do not represent Pench tigers.

Recommended first model:
Backbone: ResNet-18 or MobileNetV3-Large
Embedding size: 256 or 512
Loss: Cross-entropy identity loss + batch-hard triplet loss
Output: L2-normalized embedding
Distance: cosine distance


A practical first configuration:
input size: 256 x 128 or 320 x 192
embedding dimension: 256
backbone: ResNet-18
optimizer: AdamW
initial learning rate: 3e-4
weight decay: 1e-4
batch composition: 16 identities x 4 images
epochs: 50 to 100
loss: 0.5 cross-entropy + 0.5 triplet


For stripe identity, aspect ratio matters. A wide flank crop is usually more useful than a square whole-animal crop.

Train three variants:
Model A: full animal crop
Model B: body/flank crop
Model C: full + flank embeddings concatenated


Then compare them. Do not assume the fanciest model wins.
---
13. Decide how to create flank crops

ATRW pose keypoints can help train a body-part cropper, but at inference you need a practical solution.

Use this progression:
Version 1: padded detector crop

Take the tiger bounding box and expand it:
left: 15%
right: 15%
top: 10%
bottom: 10%


This gives you a working baseline quickly.
Version 2: pose-guided crop

Use pose keypoints to estimate:
shoulder
hip
spine
neck
tail base


Then generate a side-body crop.
Version 3: segmentation or flank detector

Train a lightweight segmentation or body-part model only after you have baseline results. This is more work and may not improve performance if the local camera images are low quality.

The correct order is:
baseline padded crop
→ evaluate
→ add pose
→ evaluate
→ add segmentation only if necessary


Do not build segmentation first. That is a classic hackathon time sink.
---
14. Add image-quality scoring before re-ID

The re-ID model should not make confident identity decisions from unusable images.

Calculate:
sharpness
brightness
contrast
tiger box area relative to image
occlusion estimate
truncation estimate
pose/view quality
number of detected tigers


Create a quality score:
quality_score =
    0.25 * sharpness_score
  + 0.20 * brightness_score
  + 0.20 * box_area_score
  + 0.20 * flank_visibility_score
  + 0.15 * occlusion_score


The exact weights can change after validation. The important part is to store the components separately.

Quality policy:
high quality:
    eligible for automatic ID assignment

medium quality:
    eligible for candidate retrieval, human confirmation preferred

low quality:
    no automatic identity assignment, review only


A poor crop should produce “insufficient evidence,” not a random tiger ID.
---
15. Build the identity catalogue

The catalogue should contain multiple reference embeddings per individual, not one average vector only.

Tables or files should store:
individual_id
source
species
sex
age_class
known_since
reference_image_id
embedding_path
flank_side
quality_score
review_status


For each known tiger:
5 to 20 high-quality reference images
left/right side recorded when known
different poses represented
different lighting represented


Compute:
individual centroid embedding
individual medoid embedding
per-image embeddings


At retrieval time compare against both:
nearest reference image
nearest individual centroid


This avoids one bad reference image dominating the decision.

For a new individual:
create provisional ID: PENCH_UNK_0001
send to review
do not immediately merge with an existing known tiger


Only promote a provisional ID after:
multiple sightings
consistent appearance
human confirmation
no close competing identity

---
16. Use open-set identity decisions

Never choose the nearest tiger blindly.

For each query image, calculate:
top_1_distance
top_2_distance
distance_margin = top_2_distance - top_1_distance
same-individual similarity distribution
different-individual similarity distribution
image quality
number of supporting images


Decision example:
AUTO_MATCH:
    top_1 distance below calibrated threshold
    margin above calibrated margin
    quality above minimum
    at least one supporting reference image
    no conflicting evidence

REVIEW_MATCH:
    distance plausible but margin weak
    medium-quality crop
    partial body
    left/right flank uncertainty
    top candidates are close

NEW_OR_UNKNOWN:
    all distances poor
    no stable candidate
    quality sufficient to conclude it is not a known individual

UNUSABLE:
    quality too low to distinguish known versus unknown


Calibrate thresholds on held-out ATRW identities first, then recalibrate on locally labelled Pench examples.

Do not copy thresholds from a paper. Your image source is different.
---
17. Use a human review queue

The review UI should show:
query image
tiger crop
flank crop
top 5 candidate identities
similarity scores
reference images for each candidate
station
timestamp
GPS
model confidence
reason for review


Reviewer actions:
confirm candidate ID
choose another candidate
mark unknown/new individual
mark not tiger
mark unusable
merge provisional IDs
split incorrectly merged IDs
correct station
correct timestamp
correct flank side


Every correction becomes training data.

Store:
review_id
image_id
old_prediction
new_label
reviewer
review_timestamp
review_reason
model_version


The review system is not a backup feature. It is how the model becomes useful on Pench data.
---
18. Use sequence information

Camera traps often produce a burst of related images. Process individual images for traceability, but aggregate identity decisions at the event level.

Create a sequence ID using:
same station
same normalized date
time gap below configurable threshold
same folder or filename prefix


Example:
same station + gap <= 60 seconds = same event


Do not hard-code 60 seconds without checking the camera protocol. Store the threshold in configuration.

For an event:
run re-ID on all usable frames
discard low-quality duplicate frames from voting
aggregate top candidate scores
require agreement across multiple frames


A single bad frame should not override four consistent frames.

Store both:
frame-level prediction
event-level prediction


This makes the audit trail defensible.
---
19. Design the SQLite database

Use SQLite because it is offline, portable, and sufficient for a laptop prototype.

Core tables:
images
runs
stations
detections
crops
embeddings
individuals
identity_matches
review_queue
survey_effort
alerts
model_versions
audit_log


Important images fields:
image_id PRIMARY KEY
sha256 UNIQUE
absolute_path
relative_path
filename
width
height
file_size
timestamp_original
timestamp_normalized
timestamp_source
station_raw
station_id
run_id
sequence_id
is_corrupt
created_at


Important detections fields:
detection_id PRIMARY KEY
image_id
class_name
confidence
x1
y1
x2
y2
model_version
inference_time_ms


Important identity_matches fields:
match_id PRIMARY KEY
image_id
detection_id
individual_id
top_distance
second_distance
margin
quality_score
decision
decision_confidence
model_version
review_status


Use foreign keys. Add indexes on:
timestamp_normalized
station_id
individual_id
run_id
sequence_id
decision


Never overwrite an old prediction. Insert a new model run or audit record.
---
20. Add survey-effort correction before movement alerts

This is crucial. A tiger appearing at a new station means little if that station was newly installed or the old station was not operating.

Track per station and run:
station active?
camera installed?
camera operational?
number of trap nights
number of images
number of valid images
number of blank images
number of animal detections


For each tiger, store:
first detection date
last detection date
number of independent events
stations used
station visit frequency
days observed
days camera was active


A “prolonged absence” alert should only fire if:
the tiger was previously observed regularly
relevant stations remained operational
survey effort was adequate
there were no major timestamp or metadata problems


A new-station alert should require:
station was active during the relevant period
station was not newly installed
identity confidence is high or human-confirmed
at least one additional supporting observation when possible

---
21. Occupancy and home-range calculations

For each individual and run, calculate:
unique stations
unique independent events
first and last capture
capture frequency by station
centroid of observed stations
minimum convex polygon
kernel density estimate if enough points exist
core-use area
buffer/core classification
station overlap with other individuals


Do not call a convex hull a true home range when there are only two or three points. Label it:
observed detection envelope


Suggested minimum evidence:
fewer than 3 stations:
    no area estimate, show points only

3 to 5 stations:
    show convex hull with low-confidence label

more than 5 independent stations:
    estimate convex hull and centroid

sufficient repeated observations:
    estimate kernel density or utilization distribution


Use projected coordinates for area calculations. Do not calculate square kilometers directly from latitude/longitude degrees.

If you have Pench boundary shapefiles, clip visualizations to:
reserve boundary
core zone
buffer zone
village-adjacent zone


Keep the raw points visible. A polished map that hides sparse evidence is worse than an ugly honest map.
---
22. Movement-deviation alerts

Implement alerts in stages.
Alert A: first use of a station

Trigger only when:
individual match is confirmed or high confidence
station was operational
station was not newly installed
station lies outside historical station set


Output:
Tiger PENCH_004 first detected at ST_023 on 2026-08-15.
Evidence: 3 independent events, 2 high-quality flank views.
Distance from historical centroid: 7.4 km.
Confidence: medium/high.

Alert B: centroid shift

Calculate the distance between:
current run centroid
historical baseline centroid


Use the problem statement's thresholds as configurable policy values, not universal biological truth.

Store:
threshold_value
threshold_unit
region
baseline_period
current_period
distance
confidence

Alert C: buffer or village movement

Require:
station region metadata
high-confidence individual match
at least one corroborating event


Do not infer village adjacency from a visual image. Use GIS station metadata.
Alert D: prolonged absence

Define:
minimum historical event count
minimum historical regularity
minimum active survey effort
absence duration


Example initial policy:
at least 5 historical independent events
observed in at least 3 previous monitoring periods
station network operational for at least 80% of expected effort
no confirmed detection for 1.5x the median interval


These are starting values to tune with field staff.
Alert E: data-quality warning

Add alerts for:
camera clock reset
many impossible timestamps
station folder mismatch
sudden zero images from active station
duplicate SD-card contents
large new image format
high corruption rate


Data-quality alerts may be more useful than premature behavioral alerts.
---
23. Training schedule on the RTX 4060

Use the RTX 4060 for training only.
Stage 1: detector validation

Do not fine-tune MDV6 immediately. Run the pretrained model on:
ATRW detection validation images
your local camera-trap sample


Measure:
animal recall
blank false-negative rate
person recall
vehicle recall
inference time


Only fine-tune detection if the local data shows systematic missed animals.
Stage 2: tiger classifier

Train the compact tiger classifier first. It is easier to debug than re-ID.

Save:
best_val_loss.pth
best_f1.pth
best_recall.pth


Choose the checkpoint based on tiger recall, not only accuracy.
Stage 3: re-ID baseline

Train:
ResNet-18 + 256-dimensional embedding


Evaluate:
Rank-1
Rank-5
mean average precision
same/different distance distributions
open-set unknown rejection

Stage 4: re-ID improvements

Try one change at a time:
pose-guided crop
flank-only crop
hard-negative mining
ArcFace loss
batch-hard triplet loss
larger embedding
stronger augmentation


Do not change backbone, crop, loss, and augmentation simultaneously. You will not know what helped.
---
24. Evaluation protocol

Your evaluation must be separated into four tasks.
A. Blank filtering

Report:
blank precision
blank recall
animal false-negative rate
tiger false-negative rate
human false-negative rate
images sent to review
images auto-excluded


The critical number is:
tiger images wrongly excluded as blank

B. Tiger detection

Report:
precision
recall
mAP50
mAP50:95 if available
small/medium/large tiger performance
night performance
occlusion performance

C. Individual re-ID

Report:
Rank-1
Rank-5
mAP
known-identity precision
unknown rejection rate
false-match rate
review rate
performance by flank side
performance by image quality
performance by pose

D. Operational throughput

Measure on the target laptop:
images per second
minutes per 1,000 images
RAM peak
disk usage
startup time
resume time after interruption
time spent on review


Run at least:
1,000 images
10,000 images
30,000 images


Do not extrapolate from 50 images. Camera-trap pipelines often fail because of memory leaks, not model accuracy.
---
25. Export models for CPU inference

Export separately:
MDV6 detector ONNX
tiger classifier ONNX
stripe embedding model ONNX


Use:
ONNX Runtime CPU
graph optimization enabled
static input shape initially
FP32 first
INT8 only after accuracy validation


Do not quantize the re-ID model before measuring accuracy. Stripe details can be sensitive to aggressive quantization.

Recommended deployment order:
FP32 ONNX
→ verify numerical agreement with PyTorch
→ benchmark CPU
→ try FP16 only if the CPU supports it well
→ try INT8 classifier
→ try INT8 detector
→ quantize re-ID only if necessary


Validate that PyTorch and ONNX embeddings have nearly identical cosine similarity for the same images.

Use a model manifest:
model_name
version
file_path
sha256
input_shape
normalization
class_names
embedding_dimension
training_dataset
license
export_date

---
26. CPU performance strategy

For laptop inference:
use batch size 1 or small batch size
resize before model inference
cache detector results
avoid recomputing duplicate frames
use multiprocessing only around image loading
limit ONNX threads based on testing
store embeddings once
use approximate nearest-neighbor search after catalogue grows


Do not run the re-ID model on every raw image. The cascade should be:
all images
→ MDV6
→ only animal candidates
→ tiger classifier
→ only tiger candidates
→ quality filter
→ re-ID


For burst sequences:
detect every image initially
re-ID only the best 1 to 3 frames per event


That can reduce re-ID work dramatically without losing event-level information.

Start with brute-force cosine search for a small catalogue. Move to HNSW or FAISS only when the identity/reference count becomes large.
---
27. Build the first command-line pipeline

The first usable version should run in explicit stages:
python scripts\01_inventory.py ^
  --input E:\Chaos\Hackathons\VNIT\data\raw\pench_runs\run_001 ^
  --output E:\Chaos\Hackathons\VNIT\data\interim\inventory\run_001.parquet

python scripts\02_run_mdv6.py ^
  --inventory E:\Chaos\Hackathons\VNIT\data\interim\inventory\run_001.parquet ^
  --model E:\Chaos\Hackathons\VNIT\models\pretrained\MDV6-yolov9-c.onnx ^
  --output E:\Chaos\Hackathons\VNIT\data\interim\mdv6_predictions\run_001.json ^
  --device cpu

python scripts\03_build_crops.py ^
  --predictions E:\Chaos\Hackathons\VNIT\data\interim\mdv6_predictions\run_001.json ^
  --output E:\Chaos\Hackathons\VNIT\data\interim\crops\run_001

python scripts\07_run_pipeline.py ^
  --run-id run_001 ^
  --config configs\cpu.yaml ^
  --resume


Every stage must be restartable. If the program stops at image 8,000 of 20,000, it should continue rather than start over.
---
28. Add checkpoints and resume support

Every pipeline stage should write:
stage_started
stage_completed
last_processed_image
input_manifest_hash
model_hash
output_path
error_count


Use a status table:
pipeline_jobs


Fields:
job_id
run_id
stage
status
started_at
completed_at
last_item
total_items
error_count
config_hash


Allowed statuses:
pending
running
completed
failed
paused


Never mark a stage completed if only some images succeeded.
---
29. Build the review UI after the pipeline works

Use Streamlit for the first interface.

Pages:
Run overview
Blank-review queue
Tiger-review queue
Identity catalogue
Individual timeline
Map
Alerts
Data-quality warnings
Model/evaluation report


The first UI should not try to be beautiful. It must be fast and auditable.

For each review image, include keyboard-friendly actions:
confirm
reject
unknown
not tiger
next
previous


Export reviewer actions as:
outputs\review_exports\review_labels_run_001.csv


Those labels become the next fine-tuning dataset.
---
30. Privacy handling for human images

If a human is detected:
do not discard the original automatically
mark as human
restrict it from ordinary tiger review
optionally create a blurred display copy
retain original only according to field policy
record the privacy action


Keep separate:
original image
review-display image
privacy-processing status


Do not use a generic blur process that overwrites evidence. Generate a derivative display image.
---
31. Recommended milestones
Milestone 1: data and inventory

Deliverables:
ATRW audit
local image inventory
duplicate report
metadata extraction report
contact sheets

Milestone 2: blank filtering

Deliverables:
MDV6 batch inference
reversible blank policy
blank-review queue
false-negative evaluation

Milestone 3: tiger detection

Deliverables:
tiger classifier
tiger crops
species-level evaluation

Milestone 4: ATRW re-ID baseline

Deliverables:
embedding model
retrieval gallery
Rank-1/Rank-5 results
unknown rejection experiment

Milestone 5: local adaptation

Deliverables:
manually labelled Pench subset
fine-tuned tiger classifier
fine-tuned re-ID model
local validation report

Milestone 6: database and review

Deliverables:
SQLite schema
human review UI
audit trail
provisional identity handling

Milestone 7: mapping and alerts

Deliverables:
station map
individual occupancy output
survey-effort correction
movement alerts

Milestone 8: laptop deployment

Deliverables:
CPU-only package
offline model bundle
one-command run
resume support
benchmark report
operator documentation

---
32. What you should implement first

Do these in this exact order:
1. Audit ATRW annotations and identity labels.
2. Build the immutable image inventory.
3. Run MDV6 on a small local sample.
4. Measure missed tiger-containing images.
5. Create a local blank/tiger validation set.
6. Implement reversible quarantine.
7. Train the compact tiger-versus-other classifier.
8. Train the ResNet-18 metric-learning baseline.
9. Build embedding retrieval and unknown rejection.
10. Create a small review UI.
11. Add SQLite persistence.
12. Add station and timestamp normalization.
13. Add maps.
14. Add survey-effort-aware alerts.
15. Export and benchmark everything on CPU.


Do not start with maps, dashboards, or movement alerts. If blank filtering and identity evidence are weak, the map will simply display confident-looking nonsense.
---
33. Recommended initial model stack

Use this as the first practical stack:
Blank/animal/person/vehicle detection:
MDV6 YOLOv9-c ONNX

Tiger-versus-other classification:
MobileNetV3-Large, 224 px, ONNX

Initial tiger re-ID:
ResNet-18, 256-dimensional embedding,
cross-entropy + batch-hard triplet loss

Search:
cosine similarity against reference embeddings

Database:
SQLite

Maps:
GeoPandas + Folium or Plotly

Interface:
Streamlit

Training:
RTX 4060 or Kaggle GPU

Inference:
ONNX Runtime CPU


If MDV6’s specific checkpoint is licensed MIT, keep that license record with the model. Do not assume every MDV6 variant has identical licensing. The current model documentation distinguishes variants and licenses, so preserve the exact source and checkpoint provenance.
---
34. The first realistic success criterion

Before claiming the system works, require this minimum pilot result:
No irreversible deletion of source files.
Very low tiger false-negative rate during blank filtering.
A functioning review queue.
Tiger classifier separates tiger from common animals.
Re-ID returns useful top-5 candidates.
Unknown tigers are not forced into known IDs.
Every prediction links to image, station, timestamp, model version, and confidence.
The complete pipeline resumes after interruption.
CPU inference works offline.


The biggest scientific risk is not CPU speed. It is domain shift from ATRW Amur/zoo imagery to wild Bengal tigers in Pench. Use ATRW to initialize the model, but treat locally reviewed Pench flank images as the data that determines whether the final identity system is trustworthy.
