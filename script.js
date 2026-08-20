document.addEventListener("DOMContentLoaded", () => {

    const state = {
        name: "",
        job: "",
        company: "",
        type: "",
        question: "",
        questionNumber: 1,
        history: []
    };


    /* =========================
       ELEMENTS
    ========================== */

    const nameInput = document.getElementById("name");
    const jobInput = document.getElementById("job");
    const companyInput = document.getElementById("company");
    const typeInput = document.getElementById("interviewType");

    const startButton = document.getElementById("startButton");
    const submitAnswer = document.getElementById("submitAnswer");

    const answerInput = document.getElementById("answer");
    const characterCount = document.getElementById("characterCount");

    const practiceSection = document.getElementById("practice");
    const loadingSection = document.getElementById("loading");
    const feedbackSection = document.getElementById("feedback");

    const questionText = document.getElementById("questionText");
    const questionNumber = document.getElementById("questionNumber");
    const questionType = document.getElementById("questionType");

    const candidateGreeting =
        document.getElementById("candidateGreeting");

    const setupError =
        document.getElementById("setupError");


    /* =========================
       CHARACTER COUNT
    ========================== */

    answerInput.addEventListener("input", () => {

        characterCount.textContent =
            `${answerInput.value.length} characters`;

    });


    /* =========================
       START INTERVIEW
    ========================== */

    startButton.addEventListener("click", async () => {

        state.name = nameInput.value.trim();
        state.job = jobInput.value.trim();
        state.company = companyInput.value.trim();
        state.type = typeInput.value;

        if (!state.name || !state.job) {

            setupError.textContent =
                "Please enter your name and the position you're preparing for.";

            return;

        }

        setupError.textContent = "";

        candidateGreeting.textContent =
            `${state.name}, take your time. Your goal is to show what you can bring to the role.`;

        practiceSection.classList.remove("hidden");

        practiceSection.scrollIntoView({
            behavior: "smooth"
        });

        await getQuestion();

    });


    /* =========================
       GET QUESTION
    ========================== */

    async function getQuestion() {

        questionText.textContent =
            "Creating your interview question...";

        submitAnswer.disabled = true;

        try {

            const response = await fetch("/api/question", {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({

                    name: state.name,
                    job: state.job,
                    company: state.company,
                    type: state.type

                })

            });


            const data = await response.json();


            if (!response.ok) {
                throw new Error(data.error || "Unable to create question.");
            }


            state.question = data.question;

            questionText.textContent =
                data.question;

            questionType.textContent =
                state.type.toUpperCase();

            questionNumber.textContent =
                `QUESTION ${state.questionNumber}`;

            answerInput.value = "";

            characterCount.textContent =
                "0 characters";

            submitAnswer.disabled = false;

        }

        catch (error) {

            questionText.textContent =
                "Something went wrong.";

            setupError.textContent =
                error.message;

        }

    }


    /* =========================
       SUBMIT ANSWER
    ========================== */

    submitAnswer.addEventListener("click", async () => {

        const answer = answerInput.value.trim();

        if (answer.length < 20) {

            alert(
                "Try giving a little more detail. A strong interview answer usually includes a specific example."
            );

            return;

        }


        practiceSection.classList.add("hidden");

        loadingSection.classList.remove("hidden");

        loadingSection.scrollIntoView({
            behavior: "smooth"
        });


        try {

            const response = await fetch("/api/evaluate", {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({

                    name: state.name,
                    job: state.job,
                    company: state.company,
                    type: state.type,
                    question: state.question,
                    answer: answer

                })

            });


            const data = await response.json();


            if (!response.ok) {
                throw new Error(data.error || "Unable to evaluate answer.");
            }


            displayFeedback(data);

            saveHistory(data);

            loadingSection.classList.add("hidden");

            feedbackSection.classList.remove("hidden");

            feedbackSection.scrollIntoView({
                behavior: "smooth"
            });

        }

        catch (error) {

            loadingSection.classList.add("hidden");

            practiceSection.classList.remove("hidden");

            alert(error.message);

        }

    });


    /* =========================
       DISPLAY FEEDBACK
    ========================== */

    function displayFeedback(data) {

        document.getElementById("overallScore").textContent =
            data.scores.overall;

        document.getElementById("communicationScore").textContent =
            data.scores.communication;

        document.getElementById("relevanceScore").textContent =
            data.scores.relevance;

        document.getElementById("specificityScore").textContent =
            data.scores.specificity;


        document.getElementById("overallComment").textContent =
            data.overall_comment;


        populateList(
            "strengthsList",
            data.strengths
        );


        populateList(
            "improvementsList",
            data.improvements
        );


        document.getElementById("modelAnswer").textContent =
            data.model_answer;

    }


    /* =========================
       LIST HELPER
    ========================== */

    function populateList(id, items) {

        const list = document.getElementById(id);

        list.innerHTML = "";

        items.forEach(item => {

            const li = document.createElement("li");

            li.textContent = item;

            list.appendChild(li);

        });

    }


    /* =========================
       HISTORY
    ========================== */

    function saveHistory(data) {

        state.history.unshift({

            question: state.question,

            score: data.scores.overall,

            comment: data.overall_comment,

            date: new Date().toLocaleDateString()

        });


        renderHistory();

    }


    function renderHistory() {

        const historyList =
            document.getElementById("historyList");


        if (state.history.length === 0) {

            return;

        }


        historyList.innerHTML = "";


        state.history.forEach(item => {

            const article =
                document.createElement("article");

            article.className =
                "history-item";


            article.innerHTML = `

                <div class="history-item-top">

                    <h3>
                        ${escapeHTML(item.question)}
                    </h3>

                    <span class="score">
                        ${item.score}/100
                    </span>

                </div>

                <p>
                    ${escapeHTML(item.comment)}
                </p>

                <p>
                    ${item.date}
                </p>

            `;


            historyList.appendChild(article);

        });

    }


    /* =========================
       NEXT QUESTION
    ========================== */

    document
        .getElementById("nextQuestion")
        .addEventListener("click", async () => {

            state.questionNumber++;

            feedbackSection.classList.add("hidden");

            practiceSection.classList.remove("hidden");

            practiceSection.scrollIntoView({
                behavior: "smooth"
            });

            await getQuestion();

        });


    /* =========================
       TRY AGAIN
    ========================== */

    document
        .getElementById("tryAgain")
        .addEventListener("click", () => {

            feedbackSection.classList.add("hidden");

            practiceSection.classList.remove("hidden");

            answerInput.focus();

            practiceSection.scrollIntoView({
                behavior: "smooth"
            });

        });


    /* =========================
       NEW SESSION
    ========================== */

    document
        .getElementById("resetButton")
        .addEventListener("click", () => {

            state.questionNumber = 1;
            state.history = [];

            practiceSection.classList.add("hidden");
            feedbackSection.classList.add("hidden");

            document
                .getElementById("setup")
                .scrollIntoView({
                    behavior: "smooth"
                });

        });


    /* =========================
       SECURITY HELPER
    ========================== */

    function escapeHTML(value) {

        const div =
            document.createElement("div");

        div.textContent = value;

        return div.innerHTML;

    }

});