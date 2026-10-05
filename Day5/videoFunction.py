import cv2


def main() -> None:
    cap = cv2.VideoCapture(0)

    if not cap.isOpened():
        print("Could not open the webcam.")
        return

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                print("Could not read an image from the webcam.")
                break

            cv2.imshow("Webcam Feed", frame)
            if cv2.waitKey(1) & 0xFF == ord("q"):
                print("Quitting...")
                break
    finally:
        cap.release()
        cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
