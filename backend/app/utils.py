import re
import cv2
from pyzbar.pyzbar import decode


def extract_expiry(text: str):
    pattern = r"(exp|expiry)[^\d]*(\d{2}/\d{2,4})"
    match = re.search(pattern, text.lower())
    return match.group(2) if match else None


def check_barcode(image_path: str):
    image = cv2.imread(image_path)
    detected = decode(image)

    if not detected:
        return None, False

    code = detected[0].data.decode("utf-8")

    # Demo valid codes
    valid_codes = [
        "8901234567890",
        "1234567890123"
    ]

    return code, code in valid_codes


def check_image_quality(image_path: str):
    gray = cv2.imread(image_path, 0)
    variance = cv2.Laplacian(gray, cv2.CV_64F).var()

    return variance > 100
