import os

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

# --------------------------------------------------
# OPENAI
# --------------------------------------------------

api_key = os.getenv("OPENAI_API_KEY")

client = OpenAI(api_key=api_key) if api_key else None

MODEL = os.getenv("OPENAI_MODEL", "gpt-5.6-luna")


# --------------------------------------------------
# HOME PAGE
# --------------------------------------------------

@app.route("/")
def home():
    return send_from_directory(".", "index.html")


# --------------------------------------------------
# STATIC FILES
# --------------------------------------------------

@app.route("/<path:filename>")
def static_files(filename):
    return send_from_directory(".", filename)


# --------------------------------------------------
# AI FEEDBACK
# --------------------------------------------------

@app.route("/api/feedback", methods=["POST"])
def feedback():

    if client is None:
        return jsonify({
            "error": "OPENAI_API_KEY is not configured."
        }), 500

    data = request.get_json(silent=True)

    if not data:
        return jsonify({
            "error": "No request data was provided."
        }), 400

    name = data.get("name", "Candidate")
    job = data.get("job", "Job applicant")
    company = data.get("company", "")
    interview_type = data.get(
        "interview_type",
        "behavioral"
    )
    question = data.get("question", "")
    answer = data.get("answer", "")

    if not question.strip():
        return jsonify({
            "error": "Interview question is required."
        }), 400

    if not answer.strip():
        return jsonify({
            "error": "Interview answer is required."
        }), 400

    # --------------------------------------------------
    # AI INSTRUCTIONS
    # --------------------------------------------------

    instructions = """
You are Elevate, an AI-powered interview coach.

Evaluate an interview candidate's answer.

Give practical, encouraging, honest feedback.

Evaluate:

1. Communication
2. Relevance
3. Specificity
4. Structure
5. Confidence
6. Evidence of impact
7. STAR method when appropriate

Do not invent experiences.

Keep feedback easy for a college student to understand.

The stronger answer should preserve the candidate's
actual experience and should not invent achievements.
"""

    input_text = f"""
Candidate: {name}

Position: {job}

Company: {company or "Not provided"}

Interview type: {interview_type}

Question:
{question}

Candidate answer:
{answer}
"""

    # --------------------------------------------------
    # STRUCTURED RESPONSE
    # --------------------------------------------------

    try:

        response = client.responses.create(

            model=MODEL,

            instructions=instructions,

            input=input_text,

            text={
                "format": {
                    "type": "json_schema",
                    "name": "interview_feedback",
                    "strict": True,
                    "schema": {
                        "type": "object",
                        "properties": {

                            "overall_score": {
                                "type": "integer",
                                "minimum": 0,
                                "maximum": 100
                            },

                            "communication_score": {
                                "type": "integer",
                                "minimum": 0,
                                "maximum": 100
                            },

                            "relevance_score": {
                                "type": "integer",
                                "minimum": 0,
                                "maximum": 100
                            },

                            "specificity_score": {
                                "type": "integer",
                                "minimum": 0,
                                "maximum": 100
                            },

                            "overall_comment": {
                                "type": "string"
                            },

                            "strengths": {
                                "type": "array",
                                "items": {
                                    "type": "string"
                                }
                            },

                            "improvements": {
                                "type": "array",
                                "items": {
                                    "type": "string"
                                }
                            },

                            "stronger_answer": {
                                "type": "string"
                            }
                        },

                        "required": [
                            "overall_score",
                            "communication_score",
                            "relevance_score",
                            "specificity_score",
                            "overall_comment",
                            "strengths",
                            "improvements",
                            "stronger_answer"
                        ],

                        "additionalProperties": False
                    }
                }
            }
        )

        result = response.output_text

        return jsonify(
            __import__("json").loads(result)
        ), 200


    except Exception as error:

        print("================================")
        print("ELEVATE AI ERROR")
        print("================================")
        print(type(error).__name__)
        print(str(error))
        print("================================")

        return jsonify({
            "error": "AI feedback failed.",
            "details": str(error)
        }), 500


# --------------------------------------------------
# HEALTH CHECK
# --------------------------------------------------

@app.route("/api/health")
def health():

    return jsonify({
        "status": "ok",
        "ai_configured": client is not None,
        "model": MODEL
    })


# --------------------------------------------------
# RUN
# --------------------------------------------------

if __name__ == "__main__":

    port = int(
        os.getenv("PORT", 5000)
    )

    app.run(
        host="0.0.0.0",
        port=port,
        debug=False
    )
