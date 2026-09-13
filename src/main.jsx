import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

const defaultData = {
    moments: [
        {
            title: "Наш перший момент ❤️",
            date: "14 вересня 2025",
            text: "Той день, коли все почалося ❤️"
        }
    ],
    events: [
        {
            title: "Наша річниця ❤️",
            date: "14 жовтня 2026",
            days: 31
        }
    ],
    idea: 0
};

const ideas = [
    "Зробіть разом сніданок 🥞",
    "Влаштуйте вечір фільмів 🎬",
    "Прогуляйтеся разом 🌹",
    "Зробіть спільне фото 📸",
    "Напишіть одне одному по 5 приємних слів ❤️",
    "Влаштуйте романтичну вечерю 🕯️",
    "Згадайте ваш найкращий день разом 💕",
    "Пограйте разом у якусь гру 🎮",
    "Підіть у нове для вас місце 🌍",
    "Зробіть один одному маленький подарунок 🎁"
];

const questions = [
    "Що тобі найбільше подобається в наших стосунках?",
    "Який наш спільний момент ти ніколи не забудеш?",
    "Куди ти хочеш поїхати зі мною?",
    "Яке наше побачення було для тебе найкращим?",
    "Що ти хочеш зробити разом цього року?",
    "Яка моя риса тобі подобається найбільше?",
    "Яка наша спільна мрія?",
    "Що змушує тебе посміхатися, коли ти думаєш про мене?"
];

function App({ coupleId, inviteCode, initialData }) {
    const [moments, setMoments] = useState(
        initialData?.moments || defaultData.moments
    );

    const [events, setEvents] = useState(
        initialData?.events || defaultData.events
    );

    const [idea, setIdea] = useState(
        initialData?.idea ?? defaultData.idea
    );

    const [newMoment, setNewMoment] = useState({
        title: "",
        date: "",
        text: ""
    });

    const [question, setQuestion] = useState("");
    const [answer, setAnswer] = useState("");
    const [sent, setSent] = useState(false);

    const [surprise, setSurprise] = useState(false);

    // Зберігаємо дані в Supabase
    useEffect(() => {
        if (!coupleId) return;

        const timer = setTimeout(async () => {
            const dataToSave = {
                moments,
                events,
                idea
            };

            const { error } = await window.supabaseClient
                .from("couple_data")
                .update({
                    data: dataToSave,
                    updated_at: new Date().toISOString()
                })
                .eq("couple_id", coupleId);

            if (error) {
                console.error("Помилка збереження:", error);
            } else {
                console.log("✅ Дані пари збережено");
            }
        }, 700);

        return () => clearTimeout(timer);
    }, [moments, events, idea, coupleId]);

    function addMoment(event) {
        event.preventDefault();

        if (!newMoment.title.trim()) {
            alert("Введи назву моменту ❤️");
            return;
        }

        const moment = {
            title: newMoment.title,
            date: newMoment.date,
            text: newMoment.text
        };

        setMoments((prev) => [...prev, moment]);

        setNewMoment({
            title: "",
            date: "",
            text: ""
        });
    }

    function removeMoment(index) {
        if (!confirm("Видалити цей момент?")) return;

        setMoments((prev) =>
            prev.filter((_, i) => i !== index)
        );
    }

    function nextIdea() {
        setIdea((prev) => (prev + 1) % ideas.length);
    }

    function chooseQuestion() {
        const random =
            questions[Math.floor(Math.random() * questions.length)];

        setQuestion(random);
        setAnswer("");
        setSent(false);
    }

    function sendAnswer() {
        if (!answer.trim()) return;

        setSent(true);
    }

    function logout() {
        window.supabaseClient.auth.signOut().then(() => {
            window.location.href = "/login.html";
        });
    }

    return (
        <div className="app">

            <header className="header">
                <div>
                    <h1>Ми ❤️</h1>
                    <p>Наш маленький світ</p>
                </div>

                <button className="logout" onClick={logout}>
                    Вийти
                </button>
            </header>

            <main>

                {/* Профіль пари */}
                <section className="card profile-card">
                    <div className="heart">❤️</div>

                    <h2>Наша пара</h2>

                    <p className="muted">
                        Код вашої пари
                    </p>

                    <div className="code">
                        {inviteCode || "Завантаження..."}
                    </div>

                    <p className="hint">
                        Передайте цей код своїй коханій людині,
                        щоб вона могла приєднатися до вашої пари.
                    </p>
                </section>


                {/* Наші моменти */}
                <section className="card">
                    <h2>💕 Наші моменти</h2>

                    <div className="moments">

                        {moments.length === 0 && (
                            <p className="muted">
                                Поки що моментів немає ❤️
                            </p>
                        )}

                        {moments.map((moment, index) => (
                            <div className="moment" key={index}>

                                <div className="moment-top">
                                    <h3>{moment.title}</h3>

                                    <button
                                        className="delete"
                                        onClick={() =>
                                            removeMoment(index)
                                        }
                                    >
                                        ×
                                    </button>
                                </div>

                                {moment.date && (
                                    <div className="date">
                                        📅 {moment.date}
                                    </div>
                                )}

                                {moment.text && (
                                    <p>{moment.text}</p>
                                )}
                            </div>
                        ))}

                    </div>

                    <form
                        className="form"
                        onSubmit={addMoment}
                    >
                        <h3>Додати момент ❤️</h3>

                        <input
                            type="text"
                            placeholder="Назва моменту"
                            value={newMoment.title}
                            onChange={(e) =>
                                setNewMoment({
                                    ...newMoment,
                                    title: e.target.value
                                })
                            }
                        />

                        <input
                            type="text"
                            placeholder="Дата"
                            value={newMoment.date}
                            onChange={(e) =>
                                setNewMoment({
                                    ...newMoment,
                                    date: e.target.value
                                })
                            }
                        />

                        <textarea
                            placeholder="Розкажіть про цей момент..."
                            value={newMoment.text}
                            onChange={(e) =>
                                setNewMoment({
                                    ...newMoment,
                                    text: e.target.value
                                })
                            }
                        />

                        <button
                            className="primary"
                            type="submit"
                        >
                            Додати момент ❤️
                        </button>
                    </form>
                </section>


                {/* Події */}
                <section className="card">
                    <h2>📅 Наші події</h2>

                    {events.map((event, index) => (
                        <div
                            className="event"
                            key={index}
                        >
                            <div>
                                <h3>{event.title}</h3>

                                <p>
                                    {event.date}
                                </p>
                            </div>

                            <div className="days">
                                {event.days}
                                <span>днів</span>
                            </div>
                        </div>
                    ))}
                </section>


                {/* Ідея для побачення */}
                <section className="card idea-card">

                    <h2>💡 Ідея для нас</h2>

                    <div className="idea">
                        {ideas[idea]}
                    </div>

                    <button
                        className="primary"
                        onClick={nextIdea}
                    >
                        Інша ідея ✨
                    </button>

                </section>


                {/* Питання для пари */}
                <section className="card">

                    <h2>💬 Питання для нас</h2>

                    {!question ? (
                        <>
                            <p className="muted">
                                Оберіть випадкове питання
                                та поговоріть про нього разом ❤️
                            </p>

                            <button
                                className="primary"
                                onClick={chooseQuestion}
                            >
                                Отримати питання 💕
                            </button>
                        </>
                    ) : (
                        <>
                            <div className="question">
                                {question}
                            </div>

                            <textarea
                                placeholder="Ваша відповідь..."
                                value={answer}
                                onChange={(e) =>
                                    setAnswer(e.target.value)
                                }
                            />

                            <button
                                className="primary"
                                onClick={sendAnswer}
                            >
                                Зберегти відповідь ❤️
                            </button>

                            {sent && (
                                <div className="success">
                                    ❤️ Відповідь збережено!
                                </div>
                            )}

                            <button
                                className="secondary"
                                onClick={chooseQuestion}
                            >
                                Інше питання
                            </button>
                        </>
                    )}

                </section>


                {/* Сюрприз */}
                <section className="card surprise-card">

                    <h2>🎁 Маленький сюрприз</h2>

                    {!surprise ? (
                        <>
                            <p>
                                Тут є щось особливе для тебе...
                            </p>

                            <button
                                className="primary"
                                onClick={() => setSurprise(true)}
                            >
                                Відкрити ❤️
                            </button>
                        </>
                    ) : (
                        <div className="surprise">
                            <div className="big-heart">
                                ❤️
                            </div>

                            <h3>
                                Я тебе дуже сильно люблю! 🥰
                            </h3>

                            <p>
                                Дякую тобі за кожен наш день,
                                кожну посмішку і кожну мить разом.
                                Нехай таких моментів буде ще
                                дуже-дуже багато ❤️
                            </p>
                        </div>
                    )}

                </section>

            </main>

            <footer>
                <p>
                    Зроблено з любов'ю ❤️
                </p>
            </footer>

        </div>
    );
}


async function startApp() {

    console.log("🚀 Запуск My Couple...");

    if (!window.supabaseClient) {
        console.error("❌ Supabase Client не знайдений");

        document.body.innerHTML = `
            <div style="
                padding:40px;
                text-align:center;
                font-family:Arial;
            ">
                <h2>❌ Помилка Supabase</h2>
                <p>Не вдалося завантажити Supabase.</p>
                <button onclick="location.reload()">
                    Оновити сторінку
                </button>
            </div>
        `;

        return;
    }


    // =========================================
    // 1. Перевіряємо авторизацію
    // =========================================

    const {
        data: sessionData,
        error: sessionError
    } = await window.supabaseClient.auth.getSession();

    if (sessionError) {
        console.error(
            "Помилка отримання сесії:",
            sessionError
        );

        window.location.href = "/login.html";
        return;
    }

    const session = sessionData?.session;

    if (!session) {
        console.log("❌ Користувач не авторизований");

        window.location.href = "/login.html";
        return;
    }

    const user = session.user;

    console.log("✅ Користувач авторизований:", user.id);


    // =========================================
    // 2. Шукаємо існуючу пару
    // =========================================

    let coupleId = null;
    let inviteCode = null;
    let initialData = null;

    const {
        data: membership,
        error: membershipError
    } = await window.supabaseClient
        .from("couple_members")
        .select("couple_id")
        .eq("user_id", user.id)
        .maybeSingle();


    if (membershipError) {

        console.error(
            "Помилка пошуку пари:",
            membershipError
        );

        document.body.innerHTML = `
            <div style="
                padding:40px;
                text-align:center;
                font-family:Arial;
            ">
                <h2>❌ Не вдалося завантажити пару</h2>

                <p>
                    ${membershipError.message}
                </p>

                <button onclick="location.reload()">
                    Спробувати ще раз
                </button>
            </div>
        `;

        return;
    }


    // =========================================
    // 3. Якщо пари немає — створюємо
    // =========================================

    if (!membership) {

    console.log("👩‍❤️‍👨 Пари немає.");

    const inviteCodeFromUser =
        session.user.user_metadata?.invite_code?.trim().toUpperCase();

    if (inviteCodeFromUser) {

        console.log("🔑 Користувач має код пари:", inviteCodeFromUser);

        const { data: joinedCouple, error: joinError } =
            await window.supabaseClient.rpc(
                "join_couple",
                {
                    entered_invite_code: inviteCodeFromUser
                }
            );

        if (joinError) {

            console.error(
                "Помилка приєднання до пари:",
                joinError
            );

            document.body.innerHTML = `
                <div style="padding:40px;text-align:center;font-family:Arial;">
                    <h2>❌ Не вдалося приєднатися</h2>

                    <p>${joinError.message}</p>

                    <button onclick="location.reload()">
                        Спробувати ще раз
                    </button>
                </div>
            `;

            return;
        }

        console.log(
            "❤️ Користувача приєднано:",
            joinedCouple
        );

        coupleId = joinedCouple.couple_id;
        inviteCode = joinedCouple.invite_code;

    } else {

        console.log(
            "👤 Коду немає. Створюємо нову пару..."
        );

        const {
            data: createdCouple,
            error: createError
        } = await window.supabaseClient.rpc(
            "create_couple"
        );

        if (createError) {

            console.error(
                "Помилка створення пари:",
                createError
            );

            document.body.innerHTML = `
                <div style="padding:40px;text-align:center;font-family:Arial;">
                    <h2>❌ Не вдалося створити пару</h2>

                    <p>${createError.message}</p>

                    <button onclick="location.reload()">
                        Оновити
                    </button>
                </div>
            `;

            return;
        }

        console.log(
            "✅ Нову пару створено:",
            createdCouple
        );

        coupleId = createdCouple.couple_id;
        inviteCode = createdCouple.invite_code;
    }
    }

        if (createError) {

            console.error(
                "Помилка створення пари:",
                createError
            );

            document.body.innerHTML = `
                <div style="
                    padding:40px;
                    text-align:center;
                    font-family:Arial;
                ">
                    <h2>❌ Не вдалося створити пару</h2>

                    <p>
                        ${createError.message}
                    </p>

                    <p>
                        Перезавантаж сторінку та спробуй ще раз.
                    </p>

                    <button onclick="location.reload()">
                        Оновити
                    </button>
                </div>
            `;

            return;
        }


        console.log(
            "✅ Пару створено:",
            createdCouple
        );


        coupleId = createdCouple.couple_id;
        inviteCode = createdCouple.invite_code;

    } else {

        // =========================================
        // 4. Пара вже існує
        // =========================================

        coupleId = membership.couple_id;

        console.log(
            "✅ Знайдено існуючу пару:",
            coupleId
        );
    }


    // =========================================
    // 5. Отримуємо код пари
    // =========================================

    const {
        data: couple,
        error: coupleError
    } = await window.supabaseClient
        .from("couples")
        .select("id, invite_code")
        .eq("id", coupleId)
        .single();


    if (coupleError) {

        console.error(
            "Помилка отримання коду:",
            coupleError
        );

        document.body.innerHTML = `
            <div style="
                padding:40px;
                text-align:center;
                font-family:Arial;
            ">
                <h2>❌ Не вдалося отримати код пари</h2>

                <p>
                    ${coupleError.message}
                </p>
            </div>
        `;

        return;
    }


    inviteCode = couple.invite_code;


    console.log(
        "🔑 Код пари:",
        inviteCode
    );


    // =========================================
    // 6. Отримуємо дані пари
    // =========================================

    const {
        data: coupleData,
        error: dataError
    } = await window.supabaseClient
        .from("couple_data")
        .select("data")
        .eq("couple_id", coupleId)
        .maybeSingle();


    if (dataError) {

        console.error(
            "Помилка отримання даних:",
            dataError
        );

    } else if (coupleData?.data) {

        initialData = coupleData.data;

        console.log(
            "✅ Дані пари завантажено"
        );
    }


    // =========================================
    // 7. Запускаємо React
    // =========================================

    const rootElement =
        document.getElementById("root");

    if (!rootElement) {

        console.error(
            "❌ Елемент #root не знайдений"
        );

        return;
    }


    createRoot(rootElement).render(
        <App
            coupleId={coupleId}
            inviteCode={inviteCode}
            initialData={initialData}
        />
    );

    console.log(
        "❤️ My Couple успішно запущено!"
    );
}


// =========================================
// Запуск
// =========================================

startApp();
