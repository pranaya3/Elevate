import os
import json

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from openai import OpenAI
from dotenv import load_dotenv


# Load environment variables
load_dotenv()


app = Flask(__name__)
CORS(app)


# OpenAI client
api_key = os.getenv("OPENAI_API_KEY")

if not api_key:
    print(
        "WARNING: OPENAI_API_KEY is not set. "
        "AI feedback will not work until it is configured."
    )

client = OpenAI(api_key=api_key) if api_key else None


MODEL = os.getenv(
    "OPENAI_MODEL",
    "gpt-5.6-luna"
)


# --------------------------------------------------
# HOME PAGE
# --------------------------------------------------

@app.route("/")
def home():

    return send_from_directory(
        ".",
        "index.html"
    )


# --------------------------------------------------
# STATIC FILES
# --------------------------------------------------

@app.route("/<path:filename>")
def static_files(filename):

    return send_from_directory(
        ".",
        filename
    )


# --------------------------------------------------
# AI FEEDBACK
# --------------------------------------------------

@app.route(
    "/api/feedback",
    methods=["POST"]
)
def feedback():

    if client is None:

        return jsonify({
            "error":
                "OpenAI API key is not configured. "
                "Add OPENAI_API_KEY to your .env file."
        }), 500


    data = request.get_json(
        silent=True
    )


    if not data:

        return jsonify({
            "error": "No request data was provided."
        }), 400


    name = data.get(
        "name",
        "Candidate"
    )

    job = data.get(
        "job",
        "Job applicant"
    )

    company = data.get(
        "company",
        ""
    )

    interview_type = data.get(
        "interview_type",
        "behavioral"
    )

    question = data.get(
        "question",
        ""
    )

    answer = data.get(
        "answer",
        ""
    )


    if not question:

        return jsonify({
            "error":
                "Interview question is required."
        }), 400


    if not answer:

        return jsonify({
            "error":
                "Interview answer is required."
        }), 400


    # --------------------------------------------------
    # AI PROMPT
    # --------------------------------------------------

    prompt = f"""
You are Elevate, an AI-powered interview coach.

Your job is to evaluate an interview candidate's answer
and provide practical, encouraging, honest feedback.

Candidate:
{name}

Position:
{job}

Company:
{company or "Not provided"}

Interview type:
{interview_type}

Interview question:
{question}

Candidate answer:
{answer}

Evaluate the answer based on:

1. Communication
2. Relevance
3. Specificity
4. Structure
5. Confidence
6. Evidence of impact
7. Use of the STAR method when appropriate

Give the candidate a score from 0 to 100.

Return ONLY valid JSON.

Use exactly this structure:

{{
    "overall_score": 0,
    "communication_score": 0,
    "relevance_score": 0,
    "specificity_score": 0,
    "overall_comment": "Short overall evaluation.",
    "strengths": [
        "Strength one.",
        "Strength two.",
        "Strength three."
    ],
    "improvements": [
        "Improvement one.",
        "Improvement two.",
        "Improvement three."
    ],
    "stronger_answer": "A concise example showing how the candidate could improve their answer."
}}

Important:

- Scores must be integers from 0 to 100.
- Be constructive rather than harsh.
- Do not invent experiences for the candidate.
- Preserve the candidate's original story when creating the stronger answer.
- If the answer lacks information, explicitly tell the candidate what information is missing.
- Keep the feedback easy for a college student to understand.
"""


    try:

        response = client.responses.create(

            model=MODEL,

            input=prompt

        )


        output = response.output_text.strip()


        # Remove accidental markdown fences
        if output.startswith("```"):

            output = output.replace(
                "```json",
                ""
            )

            output = output.replace(
                "```",
                ""
            )

            output = output.strip()


        result = json.loads(output)


        required_fields = [
            "overall_score",
            "communication_score",
            "relevance_score",
            "specificity_score",
            "overall_comment",
            "strengths",
            "improvements",
            "stronger_answer"
        ]


        for field in required_fields:

            if field not in result:

                raise ValueError(
                    f"AI response is missing {field}"
                )


        return jsonify(result)


    except json.JSONDecodeError:

        return jsonify({
            "error":
                "The AI returned an invalid response. "
                "Please try again."
        }), 500


    except Exception as error:

        print(
            "OpenAI error:",
            error
        )

        return jsonify({
            "error":
                "Elevate AI could not generate feedback right now. "
                "Please check your API key and try again."
        }), 500


# --------------------------------------------------
# HEALTH CHECK
# --------------------------------------------------

@app.route(
    "/api/health",
    methods=["GET"]
)
def health():

    return jsonify({
        "status": "ok",
        "ai_configured": client is not None,
        "model": MODEL
    })


# --------------------------------------------------
# RUN SERVER
# --------------------------------------------------

if __name__ == "__main__":

    port = int(
        os.getenv(
            "PORT",
            5000
        )
    )

    app.run(
        host="0.0.0.0",
        port=port,
        debug=True
    )
