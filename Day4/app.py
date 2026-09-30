from __future__ import annotations

import base64
import uuid
from pathlib import Path

import cv2
import numpy as np
from flask import Flask, abort, render_template, request, send_from_directory, url_for
from werkzeug.utils import secure_filename


BASE_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = BASE_DIR / "generated"
OUTPUT_DIR.mkdir(exist_ok=True)

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 10 * 1024 * 1024

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}
SHAPES = {"line", "rectangle", "triangle", "circle"}


def clamp(value: int, minimum: int, maximum: int) -> int:
    return max(minimum, min(value, maximum))


def hex_to_bgr(hex_color: str) -> tuple[int, int, int]:
    value = hex_color.strip().lstrip("#")
    if len(value) != 6:
        raise ValueError("Invalid color")
    red, green, blue = (int(value[index : index + 2], 16) for index in (0, 2, 4))
    return blue, green, red


def draw_shape(
    image: np.ndarray,
    shape: str,
    color: tuple[int, int, int],
    thickness: int,
    size_percent: int,
    filled: bool,
) -> np.ndarray:
    result = image.copy()
    height, width = result.shape[:2]
    center_x, center_y = width // 2, height // 2
    half_width = max(5, width * size_percent // 100)
    half_height = max(5, height * size_percent // 100)
    line_thickness = -1 if filled and shape != "line" else thickness

    left = clamp(center_x - half_width, 0, width - 1)
    right = clamp(center_x + half_width, 0, width - 1)
    top = clamp(center_y - half_height, 0, height - 1)
    bottom = clamp(center_y + half_height, 0, height - 1)

    if shape == "line":
        cv2.line(result, (left, top), (right, bottom), color, thickness, cv2.LINE_AA)
    elif shape == "rectangle":
        cv2.rectangle(result, (left, top), (right, bottom), color, line_thickness, cv2.LINE_AA)
    elif shape == "triangle":
        points = np.array(
            [[center_x, top], [left, bottom], [right, bottom]], dtype=np.int32
        )
        if filled:
            cv2.fillPoly(result, [points], color, lineType=cv2.LINE_AA)
        else:
            cv2.polylines(result, [points], True, color, thickness, cv2.LINE_AA)
    elif shape == "circle":
        radius = max(5, min(half_width, half_height))
        cv2.circle(result, (center_x, center_y), radius, color, line_thickness, cv2.LINE_AA)

    return result


def image_data_url(file_bytes: bytes, extension: str) -> str:
    mime_types = {
        ".png": "image/png",
        ".webp": "image/webp",
        ".bmp": "image/bmp",
    }
    mime_type = mime_types.get(extension, "image/jpeg")
    encoded = base64.b64encode(file_bytes).decode("ascii")
    return f"data:{mime_type};base64,{encoded}"


@app.route("/", methods=["GET", "POST"])
def index():
    context = {
        "selected_shape": "circle",
        "selected_color": "#2563eb",
        "selected_thickness": 5,
        "selected_size": 25,
        "selected_format": "png",
        "filled": False,
    }

    if request.method == "GET":
        return render_template("index.html", **context)

    uploaded_file = request.files.get("image")
    shape = request.form.get("shape", "").lower()
    extension = Path(uploaded_file.filename or "").suffix.lower() if uploaded_file else ""

    context.update(
        selected_shape=shape,
        selected_color=request.form.get("color", "#2563eb"),
        selected_thickness=request.form.get("thickness", "5"),
        selected_size=request.form.get("size", "25"),
        selected_format=request.form.get("format", "png"),
        filled=request.form.get("filled") == "on",
    )

    if not uploaded_file or not uploaded_file.filename:
        context["error"] = "Please choose an image first."
        return render_template("index.html", **context), 400
    if extension not in ALLOWED_EXTENSIONS:
        context["error"] = "Use a JPG, JPEG, PNG, WebP, or BMP image."
        return render_template("index.html", **context), 400
    if shape not in SHAPES:
        context["error"] = "Please select a valid shape."
        return render_template("index.html", **context), 400

    file_bytes = uploaded_file.read()
    image_array = np.frombuffer(file_bytes, dtype=np.uint8)
    image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
    if image is None:
        context["error"] = "The selected file is not a readable image."
        return render_template("index.html", **context), 400

    try:
        color = hex_to_bgr(str(context["selected_color"]))
        thickness = clamp(int(context["selected_thickness"]), 1, 30)
        size_percent = clamp(int(context["selected_size"]), 10, 45)
    except (TypeError, ValueError):
        context["error"] = "The drawing settings are invalid."
        return render_template("index.html", **context), 400

    output_format = str(context["selected_format"])
    if output_format not in {"png", "jpg"}:
        output_format = "png"

    result = draw_shape(
        image, shape, color, thickness, size_percent, bool(context["filled"])
    )
    success, encoded_result = cv2.imencode(f".{output_format}", result)
    if not success:
        context["error"] = "OpenCV could not create the edited image."
        return render_template("index.html", **context), 500

    safe_stem = Path(secure_filename(uploaded_file.filename)).stem or "image"
    output_filename = f"{safe_stem}-{shape}-{uuid.uuid4().hex[:10]}.{output_format}"
    (OUTPUT_DIR / output_filename).write_bytes(encoded_result.tobytes())

    context.update(
        original_image=image_data_url(file_bytes, extension),
        result_url=url_for("download_image", filename=output_filename),
        download_name=f"{safe_stem}-{shape}.{output_format}",
        success_message=f"Your {shape} was added successfully.",
    )
    return render_template("index.html", **context)


@app.route("/download/<path:filename>")
def download_image(filename: str):
    if Path(filename).name != filename:
        abort(404)
    return send_from_directory(
        OUTPUT_DIR,
        filename,
        as_attachment=request.args.get("download") == "1",
        download_name=request.args.get("name", filename),
    )


@app.errorhandler(413)
def file_too_large(_error):
    return render_template(
        "index.html",
        error="The image is too large. The maximum upload size is 10 MB.",
        selected_shape="circle",
        selected_color="#2563eb",
        selected_thickness=5,
        selected_size=25,
        selected_format="png",
        filled=False,
    ), 413


if __name__ == "__main__":
    app.run(debug=True)
