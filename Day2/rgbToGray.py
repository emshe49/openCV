import cv2
from pathlib import Path

image_path = Path(__file__).with_name("EssaRaza.jpeg")
image = cv2.imread(str(image_path))

if image is None:
    raise FileNotFoundError(f"Unable to load image: {image_path}")

# cv2.resize uses (width, height).
width, height = 640, 480
resized_image = cv2.resize(image, (width, height))
gray_image = cv2.cvtColor(resized_image, cv2.COLOR_BGR2GRAY)

cv2.imshow("Gray Image", gray_image)
cv2.waitKey(0)
cv2.destroyAllWindows()
