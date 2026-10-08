import cv2


image = cv2.imshow("Day6/image1.webp")


edges = cv2.Canny(image,50,150)
cv2.imshow("original image",image)
cv2.imshow("edges are",edges)
cv2.imshow(0)
cv2.destroyAllWindows()