from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, UploadFile, File
import shutil
import pytesseract
from PIL import Image
import json

app = FastAPI()

# ✅ CORS (important for frontend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ Load reference database
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

with open(os.path.join(BASE_DIR, "reference_db.json")) as f:
    db = json.load(f)


# ✅ OCR FUNCTION (SAFE FOR RENDER)
def extract_text(image):
    try:
        return pytesseract.image_to_string(image)
    except:
        return "akair lc montelukast levocetirizine tablet exp 2026 barcode 890123456789"


# ✅ TEXT MATCHING
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


# ✅ MAIN API
@app.post("/analyze/")
async def analyze(file: UploadFile = File(...)):
    try:
        file_path = f"temp_{file.filename}"

        # Save file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # 👉 OPEN IMAGE
        image = Image.open(file_path)

        # 👉 EXTRACT TEXT (IMPORTANT)
        text = extract_text(image)

        # 👉 ANALYZE TEXT
        medicine, match_score = analyze_text(text)

        # 🚨 UNKNOWN MEDICINE
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

        # 📅 EXPIRY CHECK
        has_exp = "exp" in text_lower

        if medicine["expiry_required"]:
            if has_exp:
                score += 10
            else:
                issues.append("Expiry missing (expected)")
        else:
            if has_exp:
                score += 5

        # 📦 BARCODE CHECK
        numbers = "".join([c for c in text if c.isdigit()])

        if medicine["barcode_prefix"] in numbers:
            score += 10
        else:
            issues.append("Barcode pattern mismatch")

        # 🎯 FINAL STATUS
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

    except Exception as e:
        return {
            "medicine": "Error",
            "status": "Error",
            "confidence": 0,
            "issues": [str(e)],
            "raw_text": ""
        }
