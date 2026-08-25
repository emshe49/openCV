import cv2
from pathlib import Path

# EssaRaza.jpeg is in the same folder as this script
image_path = Path(__file__).with_name("EssaRaza.jpeg")
image = cv2.imread(str(image_path))

if image is not None:
    user_input = input("What do you want to do? (show/save): ").lower()

    # Convert image to grayscale
    gray_scale = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    if user_input == "show":
        cv2.imshow("Grayscale Image", gray_scale)
        cv2.waitKey(0)
        cv2.destroyAllWindows()

    elif user_input == "save":
        output_path = Path(__file__).with_name("output_gray.jpg")
        cv2.imwrite(str(output_path), gray_scale)
        print(f"Saved grayscale image: {output_path}")

    else:
        print("Invalid option. Please enter 'show' or 'save'.")

else:
    print("Error loading image.")