import cv2



image = cv2.imread("Draw.jpg")

if image is None:
    print("enter the image")
else:
    print("image loaded successfuly")
    pt1 = (44,77)
    pt2 = (123,333)
    thickness = 3
    color = (0,0,255)
    cv2.rectangle(image,pt1,pt2,color,thickness)
    cv2.imshow("image focusing rectangle",image)
    cv2.waitKey()
    cv2.destroyWindow()
