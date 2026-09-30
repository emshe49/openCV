import io
import re
import unittest
from pathlib import Path

from app import OUTPUT_DIR, app


class ShapeStudioTests(unittest.TestCase):
    def setUp(self):
        app.config.update(TESTING=True)
        self.client = app.test_client()
        self.created_files = []

    def tearDown(self):
        for filename in self.created_files:
            path = OUTPUT_DIR / filename
            if path.exists():
                path.unlink()

    def test_home_page_loads(self):
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        self.assertIn(b"Shape Studio", response.data)

    def test_image_can_be_edited_and_downloaded(self):
        source = Path(__file__).with_name("draw.jpg").read_bytes()
        response = self.client.post(
            "/",
            data={
                "image": (io.BytesIO(source), "draw.jpg"),
                "shape": "triangle",
                "color": "#ff0000",
                "thickness": "7",
                "size": "30",
                "filled": "on",
                "format": "png",
            },
            content_type="multipart/form-data",
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn(b"Download image", response.data)
        match = re.search(rb'/download/([^?" ]+)', response.data)
        self.assertIsNotNone(match)
        filename = match.group(1).decode()
        self.created_files.append(filename)

        download = self.client.get(f"/download/{filename}")
        self.assertEqual(download.status_code, 200)
        self.assertEqual(download.mimetype, "image/png")
        self.assertTrue(download.data.startswith(b"\x89PNG"))
        download.close()

    def test_invalid_file_is_rejected(self):
        response = self.client.post(
            "/",
            data={
                "image": (io.BytesIO(b"not an image"), "fake.jpg"),
                "shape": "circle",
            },
            content_type="multipart/form-data",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn(b"not a readable image", response.data)


if __name__ == "__main__":
    unittest.main()
