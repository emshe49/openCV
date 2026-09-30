import cv2


file_path = input("Enter the file path: ").strip().strip('"')
image = cv2.imread(file_path)

if image is None:
    print(f"Could not load image: {file_path}")
else:
    print("Choose an option: drawline, drawrectangle, drawtriangle, or drawcircle")
    userInput = input("enter your option ").strip().lower().replace(" ", "")

    height, width = image.shape[:2]
    color = (255, 0, 0)
    thickness = 3

    if userInput == "drawline":
        pt1 = (width // 4, height // 4)
        pt2 = (3 * width // 4, 3 * height // 4)
        cv2.line(image, pt1, pt2, color, thickness)

    elif userInput in ("drawrectangle", "rectangle"):
        top_left = (width // 4, height // 4)
        bottom_right = (3 * width // 4, 3 * height // 4)
        cv2.rectangle(image, top_left, bottom_right, color, thickness)

    elif userInput in ("drawtriangle", "triangle", "trinngle"):
        top = (width // 2, height // 4)
        bottom_left = (width // 4, 3 * height // 4)
        bottom_right = (3 * width // 4, 3 * height // 4)
        cv2.line(image, top, bottom_left, color, thickness)
        cv2.line(image, bottom_left, bottom_right, color, thickness)
        cv2.line(image, bottom_right, top, color, thickness)

    elif userInput in ("drawcircle", "circle"):
        center = (width // 2, height // 2)
        radius = min(width, height) // 4
        cv2.circle(image, center, radius, color, thickness)

    else:
        print("Unknown option")
        raise SystemExit

    cv2.imshow("Edited image", image)
    cv2.waitKey(0)
    cv2.destroyAllWindows()

    save_choice = input("Do you want to save the image? (yes/no): ").strip().lower()
    if save_choice in ("yes", "y"):
        output_path = input(
            "Enter output file name (press Enter for edited_image.jpg): "
        ).strip().strip('"')

        if not output_path:
            output_path = "edited_image.jpg"

        try:
            saved = cv2.imwrite(output_path, image)
            if saved:
                print(f"Image saved successfully: {output_path}")
            else:
                print("Image could not be saved. Check the file name and path.")
        except cv2.error as error:
            print(f"Image could not be saved: {error}")
    else:
        print("Image was not saved.")
