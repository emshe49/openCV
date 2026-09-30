import cv2


image = cv2.imread("Draw.jpg")

pt1 = (230,333)
pt2 = (555,333)
color = (255,0,0)
thickness = 4
cv2.line(image,pt1,pt2,color,thickness)
cv2.imshow("line draw",image)
cv2.waitKey()
cv2.destroyAllWindows()