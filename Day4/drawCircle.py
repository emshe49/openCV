import cv2

image = cv2.imread("draw.jpg")

if image is None:
    print("Could not load draw.jpg")
else:
    cv2.circle(image, (222, 255), 77, (0, 255, 2), -1)
    cv2.imshow("circle on the image", image)
    cv2.waitKey(0)
    cv2.destroyAllWindows()
