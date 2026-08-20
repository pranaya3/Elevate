import os
import json

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv
from openai import OpenAI


# =========================================
# SETUP
# =========================================

load_dotenv()

app = Flask(__name__)
CORS(app)

api_key = os.getenv("OPENAI_API_KEY")

if not api_key:
    print("WARNING: OPENAI_API_KEY is not configured.")

client = OpenAI(api_key=api_key) if api_key else None


# =========================================
# FRONTEND
# =========================================

@app.route("/")
def index():
    return send_from_directory(".", "index.html")


@app.route("/<path:path>")
def static_files(path):
    return send_from_directory(".", path)


# =========================================
# AI HELPER
# =========================================

def ask_ai(prompt):

    if client is None:
        raise RuntimeError(
            "OPENAI_API_KEY is not configured."
        )

    response = client.responses.create(
        model="gpt-5.6-luna",
        input=prompt
    )

    return response.output_text


# =========================================
# CREATE QUESTION
# =========================================

@app.post("/api/question")
def create_question():

    data = request.get_json() or {}

    name = data.get("name", "")
    job = data.get("job", "")
    company = data.get("company", "")
    interview_type = data.get("type", "mixed")


    prompt = f"""
You are an expert professional interview coach.

Create ONE high-quality interview question.

Candidate:
Name: {name}
Position: {job}
Company: {company or "Not specified"}
Interview type: {interview_type}

Rules:

1. Make the question realistic.
2. Do not ask a generic or low-effort question.
3. Match the position.
4. If behavioral, encourage a real example.
5. If technical, test practical understanding.
6. If situational, create a realistic workplace scenario.
7. Do not include the answer.
8. Return ONLY the interview question.
"""


    try:

        question = ask_ai(prompt)

        return jsonify({
            "question": question.strip()
        })


    except Exception as error:

        return jsonify({
            "error": str(error)
        }), 500


# =========================================
# EVALUATE ANSWER
# =========================================

@app.post("/api/evaluate")
def evaluate_answer():

    data = request.get_json() or {}

    name = data.get("name", "")
    job = data.get("job", "")
    company = data.get("company", "")
    interview_type = data.get("type", "mixed")
    question = data.get("question", "")
    answer = data.get("answer", "")


    prompt = f"""
You are an expert interview coach.

Evaluate the candidate's interview answer.

Candidate:
Name: {name}
Position: {job}
Company: {company or "Not specified"}
Interview type: {interview_type}

QUESTION:
{question}

CANDIDATE ANSWER:
{answer}

Evaluate the answer fairly.

Consider:

- Communication
- Relevance
- Specificity
- Structure
- Professionalism
- Evidence of impact
- Confidence shown through language
- Whether the answer actually addresses the question

Return ONLY valid JSON.

Use exactly this structure:

{{
    "scores": {{
        "overall": 0,
        "communication": 0,
        "relevance": 0,
        "specificity": 0
    }},
    "overall_comment": "string",
    "strengths": [
        "string",
        "string",
        "string"
    ],
    "improvements": [
        "string",
        "string",
        "string"
    ],
    "model_answer": "string"
}}

Scoring:
0-59 = Needs significant improvement
60-69 = Developing
70-79 = Good
80-89 = Strong
90-100 = Excellent

Do not be unnecessarily harsh.

The model answer should be realistic and should NOT invent achievements
or experiences for the candidate that were not provided.
"""


    try:

        raw = ask_ai(prompt)

        cleaned = raw.strip()

        if cleaned.startswith("```"):
            cleaned = cleaned.replace("```json", "")
            cleaned = cleaned.replace("```", "")
            cleaned = cleaned.strip()


        result = json.loads(cleaned)

        return jsonify(result)


    except json.JSONDecodeError:

        return jsonify({
            "error": "The AI returned an invalid response. Please try again."
        }), 500


    except Exception as error:

        return jsonify({
            "error": str(error)
        }), 500


# =========================================
# RUN SERVER
# =========================================

if __name__ == "__main__":

    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True
    )