# VisionLab Studio — OpenCV Filter & Sharpening Web App

An interactive web application built to explore and compare the computer vision concepts learned in **Day 5**:
1. **Gaussian Blur** (`cv2.GaussianBlur`)
2. **Median Blur** (`cv2.medianBlur`)
3. **Image Sharpening** (`cv2.filter2D` using Laplacian kernels)

---

## 🚀 Features

- **Upload Any Image**: Drag and drop your own photo or click **"Load draw.jpg"** to immediately use the Day 5 tutorial image.
- **Separate Filter Controls**:
  - **Gaussian Blur**: Adjust Kernel Size ($k \times k$, e.g. $9 \times 9$) and Sigma $\sigma$ (Gaussian standard deviation).
  - **Median Blur**: Adjust aperture size ($k$, e.g. $11$) to witness salt-and-pepper noise removal while keeping crisp edges.
  - **Image Sharpening**: Choose between **Day 5 Standard (4-Neighbor)**, **Strong (8-Neighbor)**, or **Unsharp Mask**, with an adjustable strength multiplier.
- **Interactive Split Slider**: Drag the vertical divider across your image to compare **Original vs Processed** in real time!
- **Multiple View Modes**:
  - **Split Slider** (Interactive Before/After wipe)
  - **Side-by-Side** (Dual card inspection)
  - **Filtered Only** (Single clean view)
- **Live Kernel Matrix & Code Inspector**: See the mathematical matrix and exact Python code being generated for each filter.
- **One-Click Download**: Download the processed result with descriptive filenames.
- **Dual Processing Engines**: Powered by the Python OpenCV backend with an in-browser HTML5 Canvas fallback.

---

## 🖥️ How to Run

### Method 1: Using the Python Server (Recommended)
Open a terminal in this folder and run:
```bash
python app.py
```
Or double-click `run.bat`.

Then open your browser at:
👉 **[http://127.0.0.1:5000](http://127.0.0.1:5000)**

### Method 2: Direct Browser Opening (No server needed)
You can also directly double-click `index.html` in your file explorer to open the app in any modern browser using the client-side processing engine.

---

## 📁 File Structure

```
WorkOnImage/
├── app.py                 # Flask server with OpenCV API routes
├── index.html             # Standalone entry point
├── run.bat                # 1-click launcher for Windows
├── templates/
│   └── index.html         # Jinja template for Flask
├── static/
│   ├── draw.jpg           # Sample image from Day 5
│   ├── css/
│   │   └── style.css      # Dark glassmorphic design system
│   └── js/
│       └── app.js         # Interactive slider, filter hooks, and download logic
└── README.md
```
