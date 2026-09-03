import cv2

image = cv2.imread("output_gray.jpg")

croped = image[233:499, 184:432]

cv2.imshow("the original image is: ", image)
cv2.imshow("the cropped image is: ", croped)
cv2.imwrite("croped.jpg", croped)
cv2.waitKey(0)
cv2.destroyAllWindows()