from pathlib import Path

import cv2
import numpy as np


image_path = Path(__file__).with_name("draw.jpg")
image = cv2.imread(str(image_path))
if image is None:
    raise FileNotFoundError(f"Could not read image: {image_path}")

kernel = np.array(
    [
        [0, -1, 0],
        [-1, 5, -1],
        [0, -1, 0],
    ]
)

sharp_image = cv2.filter2D(image, -1, kernel)

cv2.imshow("Original image", image)
cv2.imshow("Sharpened image", sharp_image)
cv2.waitKey(0)
cv2.destroyAllWindows()
