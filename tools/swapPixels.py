from PIL import Image
import random

# Load image
img = Image.open("data/sprites/large/rainbowRoads.png").convert("RGBA")
pixels = img.load()

width, height = img.size
block_size = 5

for by in range(0, height, block_size):
    for bx in range(0, width, block_size):

        # Actual block bounds (handles edges)
        x_end = min(bx + block_size, width)
        y_end = min(by + block_size, height)

        # Pick two random pixels within the block
        x1 = random.randint(bx, x_end - 1)
        y1 = random.randint(by, y_end - 1)

        x2 = random.randint(bx, x_end - 1)
        y2 = random.randint(by, y_end - 1)

        # Swap pixels
        pixels[x1, y1], pixels[x2, y2] = (
            pixels[x2, y2],
            pixels[x1, y1],
        )

# Save result
img.save("output.png")