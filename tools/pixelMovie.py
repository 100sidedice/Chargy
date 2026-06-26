import os
import cv2
import subprocess
import shutil

# -----------------------
# Settings
# -----------------------
image1_path = "data/sprites/large/rocket1.png"
image2_path = "data/sprites/large/rocket2.png"

duration = 20.0
swap_fps = 8
output_fps = 24

output_movie = "rocketoutput.mov"
temp_dir = "temp_frames"

# -----------------------
# Load images WITH alpha
# -----------------------
img1 = cv2.imread(image1_path, cv2.IMREAD_UNCHANGED)
img2 = cv2.imread(image2_path, cv2.IMREAD_UNCHANGED)

if img1 is None or img2 is None:
    raise FileNotFoundError("Could not load one or both images.")

if img1.shape != img2.shape:
    raise ValueError("Images must have identical dimensions.")

if img1.shape[2] != 4:
    raise ValueError("Images do not contain an alpha channel.")

# -----------------------
# Create temp directory
# -----------------------
if os.path.exists(temp_dir):
    shutil.rmtree(temp_dir)

os.makedirs(temp_dir)

# -----------------------
# Generate PNG frames
# -----------------------
total_frames = int(duration * output_fps)
frames_per_swap = max(1, round(output_fps / swap_fps))

for frame_index in range(total_frames):

    swap_index = frame_index // frames_per_swap

    frame = img1 if swap_index % 2 == 0 else img2

    filename = os.path.join(
        temp_dir,
        f"frame_{frame_index:05d}.png"
    )

    cv2.imwrite(filename, frame)

# -----------------------
# Encode MOV with alpha
# -----------------------
cmd = [
    "ffmpeg",
    "-y",
    "-framerate", str(output_fps),
    "-i", os.path.join(temp_dir, "frame_%05d.png"),
    "-c:v", "png",
    "-pix_fmt", "rgba",
    output_movie
]

subprocess.run(cmd, check=True)

print(f"Saved {output_movie}")