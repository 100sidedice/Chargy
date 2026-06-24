import cv2
import numpy as np

# -----------------------
# Settings
# -----------------------
image1_path = "data/sprites/large/rrframe1.png"
image2_path = "data/sprites/large/rrframe2.png"

duration = 20.0      # seconds
swap_fps = 8       # how many times per second to switch images
output_fps = 24     # output video fps
output_file = "output.mp4"

# -----------------------
# Load images
# -----------------------
img1 = cv2.imread(image1_path)
img2 = cv2.imread(image2_path)

if img1 is None or img2 is None:
    raise FileNotFoundError("Could not load one or both images.")

if img1.shape != img2.shape:
    raise ValueError("Images must have identical dimensions.")

height, width = img1.shape[:2]

# -----------------------
# Create video
# -----------------------
fourcc = cv2.VideoWriter_fourcc(*"mp4v")
video = cv2.VideoWriter(
    output_file,
    fourcc,
    output_fps,
    (width, height)
)

total_frames = int(duration * output_fps)

# Number of video frames before swapping
frames_per_swap = max(1, round(output_fps / swap_fps))

for frame_index in range(total_frames):
    swap_index = frame_index // frames_per_swap

    frame = img1 if swap_index % 2 == 0 else img2
    video.write(frame)

video.release()

print(f"Saved {output_file}")