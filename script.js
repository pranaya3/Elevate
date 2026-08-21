const questions = {
    behavioral: [
        [
            "Tell me about a time you faced a difficult challenge and how you handled it.",
            "Behavioral"
        ],
        [
            "Tell me about a time you worked with someone whose opinion differed from yours.",
            "Behavioral"
        ],
        [
            "Describe a time you took initiative without being asked.",
            "Behavioral"
        ],
        [
            "Tell me about a mistake you made and what you learned from it.",
            "Behavioral"
        ]
    ],

    technical: [
        [
            "Describe a technical problem you solved and how you approached it.",
            "Technical"
        ],
        [
            "How do you learn a new technology or programming language?",
            "Technical"
        ],
        [
            "Tell me about a project where you had to debug a difficult issue.",
            "Technical"
        ],
        [
            "How would you explain a technical concept to someone without a technical background?",
            "Technical"
        ]
    ],

    situational: [
        [
            "What would you do if you were given a deadline you believed was unrealistic?",
            "Situational"
        ],
        [
            "How would you handle a disagreement with a teammate?",
            "Situational"
        ],
        [
            "What would you do if you noticed an important mistake shortly before a presentation?",
            "Situational"
        ],
        [
            "How would you prioritize several urgent tasks at once?",
            "Situational"
        ]
    ]
};


const els = {
    name: document.getElementById("name"),
    job: document.getElementById("job"),
    company: document.getElementById("company"),
    type: document.getElementById("interviewType"),

    start: document.getElementById("startButton"),
    reset: document.getElementById("resetButton"),

    setupError: document.getElementById("setupError"),

    practice: document.getElementById("practice"),
    feedback: document.getElementById("feedback"),
    loading: document.getElementById("loading"),

    answer: document.getElementById("answer"),
    count: document.getElementById("characterCount"),
    submit: document.getElementById("submitAnswer"),

    next: document.getElementById("nextQuestion"),
    again: document.getElementById("tryAgain"),

    qNumber: document.getElementById("questionNumber"),
    qType: document.getElementById("questionType"),
    qText: document.getElementById("questionText"),

    greeting: document.getElementById("candidateGreeting"),

    overall: document.getElementById("overallScore"),
    overallComment: document.getElementById("overallComment"),

    communication: document.getElementById("communicationScore"),
    relevance: document.getElementById("relevanceScore"),
    specificity: document.getElementById("specificityScore"),

    strengths: document.getElementById("strengthsList"),
    improvements: document.getElementById("improvementsList"),

    model: document.getElementById("modelAnswer"),

    history: document.getElementById("historyList")
};


let session = {
    name: "",
    job: "",
    company: "",
    type: "behavioral",
    index: 0,
    questionSet: []
};


function getQuestionSet(type) {

    if (type === "mixed") {

        return [
            ...questions.behavioral.slice(0, 2),
            ...questions.technical.slice(0, 1),
            ...questions.situational.slice(0, 1)
        ];

    }

    return questions[type];

}


function updateCount() {

    const count = els.answer.value.length;

    els.count.textContent =
        `${count.toLocaleString()} character${count === 1 ? "" : "s"}`;

}


function renderQuestion() {

    const current =
        session.questionSet[session.index];

    if (!current) {
        return;
    }

    els.qNumber.textContent =
        `QUESTION ${session.index + 1} OF ${session.questionSet.length}`;

    els.qType.textContent =
        current[1].toUpperCase();

    els.qText.textContent =
        current[0];

    els.answer.value = "";

    updateCount();

    els.feedback.classList.add("hidden");

    els.loading.classList.add("hidden");

    setTimeout(() => {
        els.answer.focus();
    }, 250);
}


function startSession() {

    const name =
        els.name.value.trim();

    const job =
        els.job.value.trim();

    if (!name || !job) {

        els.setupError.textContent =
            "Please enter your name and the position you are practicing for.";

        return;
    }

    els.setupError.textContent = "";

    session = {
        name: name,
        job: job,
        company: els.company.value.trim(),
        type: els.type.value,
        index: 0,
        questionSet: getQuestionSet(els.type.value)
    };

    els.greeting.textContent =
        `Good luck, ${name}. Take your time — a strong answer is better than a fast answer.`;

    renderQuestion();

    els.practice.classList.remove("hidden");

    els.practice.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}


async function getAIFeedback() {

    const answer =
        els.answer.value.trim();

    if (answer.length < 25) {

        els.count.textContent =
            "Please write a little more before requesting AI feedback.";

        els.count.style.color = "#b33b50";

        els.answer.focus();

        return;
    }

    els.count.style.color = "";

    const question =
        els.qText.textContent;

    const type =
        session.type;

    els.feedback.classList.add("hidden");

    els.loading.classList.remove("hidden");

    els.loading.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });


    try {

        const response =
            await fetch("/api/feedback", {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({

                    name: session.name,

                    job: session.job,

                    company: session.company,

                    interview_type: type,

                    question: question,

                    answer: answer

                })

            });


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.error ||
                "Something went wrong while getting AI feedback."
            );

        }


        displayFeedback(data);

        saveHistory(data);

        renderHistory();

        els.loading.classList.add("hidden");

        els.feedback.classList.remove("hidden");

        els.feedback.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });


    } catch (error) {

        console.error(error);

        els.loading.classList.add("hidden");

        els.feedback.classList.remove("hidden");

        els.overall.textContent = "—";

        els.overallComment.textContent =
            error.message ||
            "Unable to connect to Elevate AI.";

        els.communication.textContent = "—";
        els.relevance.textContent = "—";
        els.specificity.textContent = "—";

        els.strengths.innerHTML =
            "<li>Please make sure the Flask server is running.</li>";

        els.improvements.innerHTML =
            "<li>Check your API key and server configuration.</li>";

        els.model.textContent =
            "AI feedback could not be generated.";

    }

}


function displayFeedback(data) {

    els.overall.textContent =
        data.overall_score;

    els.communication.textContent =
        data.communication_score;

    els.relevance.textContent =
        data.relevance_score;

    els.specificity.textContent =
        data.specificity_score;

    els.overallComment.textContent =
        data.overall_comment;


    els.strengths.innerHTML =
        data.strengths
            .map(item => `<li>${escapeHTML(item)}</li>`)
            .join("");


    els.improvements.innerHTML =
        data.improvements
            .map(item => `<li>${escapeHTML(item)}</li>`)
            .join("");


    els.model.textContent =
        data.stronger_answer;

}


function escapeHTML(value) {

    const div =
        document.createElement("div");

    div.textContent =
        value;

    return div.innerHTML;

}


function saveHistory(data) {

    const history =
        JSON.parse(
            localStorage.getItem("elevateHistory") ||
            "[]"
        );


    history.unshift({

        date:
            new Date().toLocaleString(),

        question:
            els.qText.textContent,

        score:
            data.overall_score,

        job:
            session.job

    });


    localStorage.setItem(
        "elevateHistory",
        JSON.stringify(history.slice(0, 12))
    );

}


function renderHistory() {

    const history =
        JSON.parse(
            localStorage.getItem("elevateHistory") ||
            "[]"
        );


    if (!history.length) {

        els.history.innerHTML = `
            <div class="empty-history">
                <span>✦</span>

                <h3>
                    No practice sessions yet.
                </h3>

                <p>
                    Complete your first question and
                    your progress will appear here.
                </p>
            </div>
        `;

        return;
    }


    els.history.innerHTML =
        history.map(item => `

            <div class="history-item">

                <div>

                    <strong>
                        ${escapeHTML(item.job)}
                    </strong>

                    <div class="history-meta">
                        ${escapeHTML(item.date)}
                        ·
                        ${escapeHTML(item.question)}
                    </div>

                </div>

                <strong>
                    ${item.score}/100
                </strong>

            </div>

        `).join("");

}


function resetSession() {

    session = {
        name: "",
        job: "",
        company: "",
        type: "behavioral",
        index: 0,
        questionSet: []
    };

    els.name.value = "";
    els.job.value = "";
    els.company.value = "";

    els.type.value =
        "behavioral";

    els.answer.value = "";

    els.setupError.textContent = "";

    els.practice.classList.add("hidden");

    els.feedback.classList.add("hidden");

    els.loading.classList.add("hidden");

    updateCount();

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


els.start.addEventListener(
    "click",
    startSession
);


els.submit.addEventListener(
    "click",
    getAIFeedback
);


els.answer.addEventListener(
    "input",
    updateCount
);


els.reset.addEventListener(
    "click",
    resetSession
);


els.next.addEventListener(
    "click",
    () => {

        if (!session.questionSet.length) {
            return;
        }

        session.index++;

        if (
            session.index >=
            session.questionSet.length
        ) {

            alert(
                "You completed this practice set! Starting again from Question 1."
            );

            session.index = 0;
        }

        renderQuestion();

        els.practice.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    }
);


els.again.addEventListener(
    "click",
    () => {

        els.feedback.classList.add("hidden");

        els.answer.focus();

        els.answer.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });

    }
);


document.addEventListener(
    "keydown",
    event => {

        if (
            (event.metaKey || event.ctrlKey) &&
            event.key === "Enter" &&
            !els.practice.classList.contains("hidden")
        ) {

            getAIFeedback();

        }

    }
);


renderHistory();

updateCount();
