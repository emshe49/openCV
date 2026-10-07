from pathlib import Path

import cv2


def main() -> None:
    image_path = Path(__file__).with_name("draw.jpg")
    image = cv2.imread(str(image_path))
    if image is None:
        raise FileNotFoundError(f"Could not read image: {image_path}")

    blurred = cv2.medianBlur(image, 11)
    cv2.imshow("Original image", image)
    cv2.imshow("Blurred image", blurred)
    cv2.waitKey(0)
    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
