import cv2

image = cv2.imread("resize.png")

flip = cv2.flip(image,1)
flig = cv2.flip(image,0)
flig_x = cv2.flip(image,-1)

print(flip.shape)
cv2.imshow("flip", flip)
cv2.imshow("flig", flig)
cv2.imshow("flig_x", flig_x)
cv2.waitKey(0)
cv2.destroyAllWindows()