from PIL import Image

# Input and output filenames
input_file = "brunk(1).png"
output_file = "image_grayscale.png"
with Image.open(input_file) as img:
    # Ensure RGBA
    img = img.convert("RGBA")

    # Separate alpha
    r, g, b, a = img.split()

    # Convert RGB part to grayscale
    gray = Image.merge("RGB", (r, g, b)).convert("L")

    # Rebuild RGBA with original alpha
    result = Image.merge("RGBA", (gray, gray, gray, a))

    result.save(output_file)

print(f"Saved: {output_file}")
print(f"Saved grayscale image as {output_file}")