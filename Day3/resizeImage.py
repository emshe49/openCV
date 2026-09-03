import os
import cv2

# Get the path relative to this script's directory
current_dir = os.path.dirname(os.path.abspath(__file__))
image_path = os.path.join(current_dir, "output_gray.jpg")

image = cv2.imread(image_path)

if image is None:
    print("image is required")
else:
    resize_image = cv2.resize(image, (400, 400))
    cv2.imshow("the original image is: ", image)
    cv2.imshow("the resize image is: ", resize_image)
    cv2.imwrite(os.path.join(current_dir, "resize.png"), resize_image)
    cv2.waitKey(0)
    cv2.destroyAllWindows()