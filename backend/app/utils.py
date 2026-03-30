import json
import cv2
import numpy as np
import re

# Load database
with open("reference_db.json", "r") as f:
    db = json.load(f)


# 🔤 Extract expiry
def extract_expiry(text):
    patterns = [
        r"(exp|expiry)[^\d]*(\d{2}/\d{2,4})",
        r"\d{2}/\d{2,4}"
    ]
    for p in patterns:
        match = re.search(p, text.lower())
        if match:
            return match.group(0)
    return None


# 🎨 Color feature
def get_mean_color(image_path):
    img = cv2.imread(image_path)
    return np.mean(img, axis=(0, 1))


# 🧠 Find closest medicine using keywords
def identify_medicine(text):
    text = text.lower()
    best_match = None
    max_matches = 0

    for key, value in db.items():
        matches = sum([1 for k in value["expected_keywords"] if k in text])
        if matches > max_matches:
            max_matches = matches
            best_match = value

    return best_match


# 🔍 Compare with database
def compare_with_reference(text, image_path):
    ref = identify_medicine(text)

    if not ref:
        return None, ["Medicine not recognized"]

    issues = []
    score = 0

    # Text length
    text_length = len(text)
    if abs(text_length - ref["avg_text_length"]) < 50:
        score += 1
    else:
        issues.append("Text structure mismatch")

    # Expiry
    has_exp = "exp" in text.lower()
    if has_exp == ref["has_exp"]:
        score += 1
    else:
        issues.append("Expiry format mismatch")

    # Color
    mean_color = get_mean_color(image_path)
    ref_color = np.array(ref["color_mean"])
    diff = np.linalg.norm(mean_color - ref_color)

    if diff < 60:
        score += 1
    else:
        issues.append("Packaging color deviation detected")

    return ref, score, issues
