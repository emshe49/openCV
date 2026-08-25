# image shape function

import cv2
from pathlib import Path

# GScale.jpg is in the project root, one level above this script.
image_path = Path(__file__).parent.parent / "GScale.jpg"
image = cv2.imread(str(image_path))

if image is None:
    raise FileNotFoundError(f"Unable to load image: {image_path}")

height, width, channels = image.shape
print(f"height: {height}, width: {width}, channels: {channels}")
