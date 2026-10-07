import base64
import time
from pathlib import Path
from typing import Any, Dict

import cv2
import numpy as np
from flask import Flask, jsonify, render_template, request, send_from_directory

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
TEMPLATES_DIR = BASE_DIR / "templates"

app = Flask(
    __name__,
    static_folder=str(STATIC_DIR),
    template_folder=str(TEMPLATES_DIR),
)


def decode_image(image_bytes: bytes) -> np.ndarray:
    """Decode raw image bytes into an OpenCV BGR numpy array."""
    nparr = np.frombuffer(image_bytes, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("Could not decode image file.")
    return image


def encode_image_to_base64(image: np.ndarray, format_ext: str = ".jpg") -> str:
    """Encode an OpenCV image to base64 data string."""
    quality = [int(cv2.IMWRITE_JPEG_QUALITY), 95] if format_ext.lower() in [".jpg", ".jpeg"] else []
    success, buffer = cv2.imencode(format_ext, image, quality)
    if not success:
        raise ValueError("Failed to encode image to output format.")
    b64_str = base64.b64encode(buffer).decode("utf-8")
    mime = "image/png" if format_ext.lower() == ".png" else "image/jpeg"
    return f"data:{mime};base64,{b64_str}"


def make_odd(val: int, min_val: int = 1, max_val: int = 51) -> int:
    """Ensure a kernel dimension is an odd positive integer."""
    val = max(min_val, min(max_val, int(val)))
    if val % 2 == 0:
        val += 1
    return val


def apply_gaussian_blur(image: np.ndarray, ksize: int, sigma: float) -> tuple[np.ndarray, Dict[str, Any]]:
    k = make_odd(ksize, min_val=1, max_val=51)
    sigma_val = max(0.0, float(sigma))
    blurred = cv2.GaussianBlur(image, (k, k), sigma_val)

    # 1D Gaussian kernel for display
    kernel_1d = cv2.getGaussianKernel(min(k, 9), sigma_val if sigma_val > 0 else -1)
    kernel_2d = np.outer(kernel_1d, kernel_1d)
    kernel_sample = np.round(kernel_2d, 4).tolist()

    info = {
        "name": "Gaussian Blur",
        "description": "Blurs the image using a Gaussian function. Ideal for smooth noise reduction while preserving general structure.",
        "cv_function": f"cv2.GaussianBlur(image, ({k}, {k}), {sigma_val:.2f})",
        "ksize": f"{k}x{k}",
        "sigma": sigma_val,
        "sample_kernel": kernel_sample,
    }
    return blurred, info


def apply_median_blur(image: np.ndarray, ksize: int) -> tuple[np.ndarray, Dict[str, Any]]:
    k = make_odd(ksize, min_val=3, max_val=51)
    blurred = cv2.medianBlur(image, k)

    info = {
        "name": "Median Blur",
        "description": "Replaces each pixel with the median of its neighboring pixels. Highly effective at removing salt-and-pepper noise while keeping edges sharp.",
        "cv_function": f"cv2.medianBlur(image, {k})",
        "ksize": f"{k}x{k}",
        "sample_kernel": f"Median window of size {k}x{k} (non-linear filter, no fixed matrix)",
    }
    return blurred, info


def apply_sharpening(image: np.ndarray, sharpen_type: str, strength: float) -> tuple[np.ndarray, Dict[str, Any]]:
    strength = max(0.1, min(5.0, float(strength)))

    if sharpen_type == "excessive":
        # 8-connected Laplacian sharpening
        # Center = 8 * strength + 1, corners and sides = -strength
        kernel = np.array([
            [-1, -1, -1],
            [-1,  9, -1],
            [-1, -1, -1]
        ], dtype=np.float32)
        if strength != 1.0:
            kernel = np.array([
                [-strength, -strength, -strength],
                [-strength, 1 + 8 * strength, -strength],
                [-strength, -strength, -strength]
            ], dtype=np.float32)
        kernel_name = "8-Neighbor Laplacian (Strong / Excessive)"
    elif sharpen_type == "unsharp":
        # Unsharp masking: Image + strength * (Image - GaussianBlur)
        gaussian = cv2.GaussianBlur(image, (9, 9), 2.0)
        sharpened = cv2.addWeighted(image, 1.0 + strength, gaussian, -strength, 0)
        info = {
            "name": "Unsharp Masking",
            "description": "Subtracts a Gaussian blurred version from the original and scales high frequencies.",
            "cv_function": f"cv2.addWeighted(image, {1.0 + strength:.2f}, cv2.GaussianBlur(image, (9,9), 2), -{strength:.2f}, 0)",
            "strength": strength,
            "sharpen_type": sharpen_type,
            "sample_kernel": "Gaussian difference unsharp mask",
        }
        return sharpened, info
    else:
        # Standard 4-connected Laplacian sharpening as learned in Day 5:
        # [[ 0, -1,  0],
        #  [-1,  5, -1],
        #  [ 0, -1,  0]]
        base_kernel = np.array([
            [0, -1, 0],
            [-1, 5, -1],
            [0, -1, 0]
        ], dtype=np.float32)
        if strength != 1.0:
            kernel = np.array([
                [0, -strength, 0],
                [-strength, 1 + 4 * strength, -strength],
                [0, -strength, 0]
            ], dtype=np.float32)
        else:
            kernel = base_kernel
        kernel_name = "Standard 4-Neighbor Laplacian (Day 5 Lesson Kernel)"

    sharpened = cv2.filter2D(image, -1, kernel)
    info = {
        "name": "Image Sharpening",
        "description": "Emphasizes edges and fine details using a 2D convolution kernel (Laplacian high-pass filter).",
        "cv_function": f"cv2.filter2D(image, -1, kernel)",
        "kernel_name": kernel_name,
        "strength": strength,
        "sharpen_type": sharpen_type,
        "sample_kernel": kernel.round(2).tolist(),
    }
    return sharpened, info


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/sample")
def get_sample_image():
    sample_file = STATIC_DIR / "draw.jpg"
    if not sample_file.exists():
        # Check Day5 parent
        parent_sample = BASE_DIR.parent / "draw.jpg"
        if parent_sample.exists():
            import shutil
            shutil.copy(str(parent_sample), str(sample_file))

    if sample_file.exists():
        return send_from_directory(str(STATIC_DIR), "draw.jpg")
    return jsonify({"error": "Sample image not found"}), 404


@app.route("/api/process", methods=["POST"])
def process_image():
    start_time = time.perf_counter()

    try:
        # 1. Acquire Image
        image = None
        if "file" in request.files and request.files["file"].filename != "":
            file = request.files["file"]
            image_bytes = file.read()
            image = decode_image(image_bytes)
        elif request.is_json and "image_b64" in request.json:
            b64_data = request.json["image_b64"]
            if "," in b64_data:
                b64_data = b64_data.split(",", 1)[1]
            image_bytes = base64.b64decode(b64_data)
            image = decode_image(image_bytes)
        else:
            # Fallback to local draw.jpg if nothing provided
            sample_file = STATIC_DIR / "draw.jpg"
            if sample_file.exists():
                image = cv2.imread(str(sample_file))

        if image is None:
            return jsonify({"error": "No valid image provided."}), 400

        # Form or JSON parameters
        params = request.form if request.form else (request.get_json(silent=True) or {})
        filter_type = params.get("filter_type", "gaussian")

        h, w = image.shape[:2]
        filter_info: Dict[str, Any] = {}

        # 2. Process based on filter
        if filter_type == "gaussian":
            ksize = int(params.get("gaussian_ksize", 9))
            sigma = float(params.get("gaussian_sigma", 2.0))
            processed, filter_info = apply_gaussian_blur(image, ksize, sigma)

        elif filter_type == "median":
            ksize = int(params.get("median_ksize", 11))
            processed, filter_info = apply_median_blur(image, ksize)

        elif filter_type == "sharpen":
            sharpen_type = params.get("sharpen_type", "standard")
            strength = float(params.get("sharpen_strength", 1.0))
            processed, filter_info = apply_sharpening(image, sharpen_type, strength)

        else:
            return jsonify({"error": f"Unknown filter_type '{filter_type}'"}), 400

        # 3. Encode result
        b64_output = encode_image_to_base64(processed, format_ext=".jpg")
        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

        return jsonify({
            "success": True,
            "filter_type": filter_type,
            "image": b64_output,
            "dimensions": {"width": w, "height": h},
            "processing_time_ms": elapsed_ms,
            "filter_info": filter_info,
        })

    except Exception as e:
        return jsonify({"error": str(e), "success": False}), 500


if __name__ == "__main__":
    print("Starting OpenCV Image Processing Web App on http://127.0.0.1:5000")
    app.run(host="127.0.0.1", port=5000, debug=True)
