import cv2

image = cv2.imread("Essa raza pic.jpeg")

if image is not None:
    cv2.imshow("image is showing",image)
    cv2.waitKey(0)
    cv2.destroyAllWindows()
    cv2.imwrite("output.jpg", image)
else:
    print("image is laoding")
