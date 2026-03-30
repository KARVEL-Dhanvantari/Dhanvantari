from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import shutil
import pytesseract
from PIL import Image

import pytesseract
pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

from utils import extract_expiry, check_barcode, check_image_quality

app = FastAPI()

# Allow frontend connection
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def home():
    return {"message": "Medicine Detector Backend Running 🚀"}


@app.post("/analyze/")
async def analyze(file: UploadFile = File(...)):
    file_path = file.filename

    # Save uploaded image
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # OCR
    text = pytesseract.image_to_string(Image.open(file_path))

    # Checks
    barcode, barcode_valid = check_barcode(file_path)
    expiry = extract_expiry(text)
    good_quality = check_image_quality(file_path)

    score = 0
    issues = []

    if barcode_valid:
        score += 1
    else:
        issues.append("Invalid or missing barcode")

    if expiry:
        score += 1
    else:
        issues.append("Expiry date not detected")

    if good_quality:
        score += 1
    else:
        issues.append("Low image quality")

    # Final decision
    if score == 3:
        status = "Likely Genuine"
        confidence = 90
    elif score == 2:
        status = "Suspicious"
        confidence = 60
    else:
        status = "Likely Fake"
        confidence = 30

    return {
        "status": status,
        "confidence": confidence,
        "barcode": barcode,
        "expiry": expiry,
        "issues": issues,
        "raw_text": text[:300]
    }
