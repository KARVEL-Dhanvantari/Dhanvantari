from fastapi.middleware.cors import CORSMiddleware

from fastapi import FastAPI, UploadFile, File
import shutil
import pytesseract
from PIL import Image
import json

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Load reference database
with open("reference_db.json") as f:
    db = json.load(f)


def analyze_text(text):
    text = text.lower()

    best_match = None
    best_score = 0

    for key, med in db.items():
        matches = sum([1 for k in med["keywords"] if k in text])

        if matches > best_score:
            best_score = matches
            best_match = med

    return best_match, best_score


@app.post("/analyze/")
async def analyze(file: UploadFile = File(...)):
    file_path = f"temp_{file.filename}"

    # Save file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # OCR
    try:
        text = pytesseract.image_to_string(Image.open(file_path))
    except:
        text = ""

    medicine, match_score = analyze_text(text)

    # 🚨 UNKNOWN MEDICINE HANDLING
    if match_score == 0:
        return {
            "medicine": "Unknown",
            "status": "Not in Database",
            "confidence": 50,
            "issues": ["No matching reference found"],
            "raw_text": text[:200]
        }

    issues = []
    score = 50
    text_lower = text.lower()

    # 🔤 KEYWORD MATCH
    if match_score >= 2:
        score += 30
    elif match_score == 1:
        score += 15
        issues.append("Weak text match")

    # 📅 EXPIRY CHECK (SMART)
    has_exp = "exp" in text_lower

    if medicine["expiry_required"]:
        if has_exp:
            score += 10
        else:
            issues.append("Expiry missing (expected)")
    else:
        if has_exp:
            score += 5  # bonus, not required

    # 📦 BARCODE CHECK (PATTERN BASED)
    numbers = "".join([c for c in text if c.isdigit()])

    if medicine["barcode_prefix"] in numbers:
        score += 10
    else:
        issues.append("Barcode pattern mismatch")

    # 🎯 Final status
    if score >= 75:
        status = "Likely Genuine"
    elif score >= 55:
        status = "Suspicious"
    else:
        status = "Likely Fake"

    return {
        "medicine": medicine["name"],
        "status": status,
        "confidence": score,
        "issues": issues,
        "raw_text": text[:200]
    }
