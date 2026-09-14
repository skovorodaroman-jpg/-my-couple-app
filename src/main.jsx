
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

const supabase = window.supabaseClient;

const DEFAULT_SETTINGS = {
    relationship_started_at: new Date().toISOString()
};

function calculateLoveTime(startDate) {
    const start = new Date(startDate);
    const now = new Date();

    if (isNaN(start.getTime())) {
        return {
            years: 0,
            months: 0,
            days: 0,
            hours: 0,
            minutes: 0,
            seconds: 0
        };
    }

    let years = now.getFullYear() - start.getFullYear();
    let months = now.getMonth() - start.getMonth();
    let days = now.getDate() - start.getDate();

    if (days < 0) {
        months--;

        const previousMonth = new Date(
            now.getFullYear(),
            now.getMonth(),
            0
        );

        days += previousMonth.getDate();
    }

    if (months < 0) {
        years--;
        months += 12;
    }

    const startWithoutDateParts = new Date(
        start.getFullYear() + years,
        start.getMonth() + months,
        start.getDate()
    );

    let remainingMs = now - startWithoutDateParts;

    if (remainingMs < 0) {
        remainingMs = 0;
    }

    const seconds = Math.floor(remainingMs / 1000) % 60;
    const minutes = Math.floor(remainingMs / (1000 * 60)) % 60;
    const hours = Math.floor(remainingMs / (1000 * 60 * 60)) % 24;

    return {
        years,
        months,
        days,
        hours,
        minutes,
        seconds
    };
}

function formatNumber(number) {
    return String(number).padStart(2, "0");
}

function App({
    user,
    profile,
    couple,
    settings,
    onSettingsChange
}) {
    const [activePage, setActivePage] = useState("home");

    const isAdmin = profile?.role === "admin";

    const [loveTime, setLoveTime] = useState(
        calculateLoveTime(settings.relationship_started_at)
    );

    const [relationshipDate, setRelationshipDate] = useState(
        settings.relationship_started_at
            ? new Date(settings.relationship_started_at)
                .toISOString()
                .slice(0, 16)
            : ""
    );

    const [savingDate, setSavingDate] = useState(false);
    const [saveMessage, setSaveMessage] = useState("");

    useEffect(() => {
        const updateCounter = () => {
            setLoveTime(
                calculateLoveTime(settings.relationship_started_at)
            );
        };

        updateCounter();

        const interval = setInterval(updateCounter, 1000);

        return () => clearInterval(interval);
    }, [settings.relationship_started_at]);

    useEffect(() => {
        setRelationshipDate(
            settings.relationship_started_at
                ? new Date(settings.relationship_started_at)
                    .toISOString()
                    .slice(0, 16)
                : ""
        );
    }, [settings.relationship_started_at]);

    async function saveRelationshipDate() {
        if (!isAdmin) {
            return;
        }

        if (!relationshipDate) {
            setSaveMessage("Вкажи дату початку ❤️");
            return;
        }

        setSavingDate(true);
        setSaveMessage("");

        const newDate = new Date(relationshipDate).toISOString();

        const { error } = await supabase
            .from("couple_settings")
            .upsert(
                {
                    couple_id: couple.id,
                    relationship_started_at: newDate,
                    updated_at: new Date().toISOString()
                },
                {
                    onConflict: "couple_id"
                }
            );

        setSavingDate(false);

        if (error) {
            console.error(error);
            setSaveMessage(
                "❌ Не вдалося зберегти. Перевір права Supabase."
            );
            return;
        }

        onSettingsChange({
            ...settings,
            relationship_started_at: newDate
        });

        setSaveMessage("❤️ Лічильник оновлено!");

        setTimeout(() => {
            setSaveMessage("");
        }, 3000);
    }

    function navigate(page) {
        setActivePage(page);
        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    }

    return (
        <div className="app">

            <style>{`
                * {
                    box-sizing: border-box;
                }

                body {
                    margin: 0;
                    font-family:
                        -apple-system,
                        BlinkMacSystemFont,
                        "Segoe UI",
                        Roboto,
                        Arial,
                        sans-serif;
                    background: #fff7fa;
                    color: #27151d;
                }

                button,
                input {
                    font-family: inherit;
                }

                button {
                    cursor: pointer;
                }

                .app {
                    min-height: 100vh;
                    background:
                        radial-gradient(
                            circle at top right,
                            rgba(255, 190, 210, 0.35),
                            transparent 30%
                        ),
                        #fff7fa;
                    padding-bottom: 90px;
                }

                .topbar {
                    width: 100%;
                    padding: 20px 20px 12px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }

                .brand {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }

                .brand-heart {
                    width: 42px;
                    height: 42px;
                    border-radius: 14px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: #ff477e;
                    color: white;
                    font-size: 22px;
                    box-shadow: 0 8px 25px rgba(255, 71, 126, .25);
                }

                .brand-title {
                    font-size: 20px;
                    font-weight: 800;
                    letter-spacing: -0.5px;
                }

                .brand-subtitle {
                    color: #9b7f89;
                    font-size: 12px;
                    margin-top: 2px;
                }

                .profile-button {
                    width: 42px;
                    height: 42px;
                    border: none;
                    border-radius: 50%;
                    background: white;
                    box-shadow: 0 5px 20px rgba(70, 30, 45, .08);
                    font-size: 20px;
                }

                .container {
                    width: min(100%, 760px);
                    margin: 0 auto;
                    padding: 0 16px;
                }

                .hero {
                    margin-top: 12px;
                    padding: 26px 22px;
                    border-radius: 28px;
                    background:
                        linear-gradient(
                            135deg,
                            #ff477e,
                            #ff759c
                        );
                    color: white;
                    position: relative;
                    overflow: hidden;
                    box-shadow: 0 18px 45px rgba(255, 71, 126, .25);
                }

                .hero::after {
                    content: "❤️";
                    position: absolute;
                    right: -10px;
                    bottom: -28px;
                    font-size: 150px;
                    opacity: .12;
                }

                .hero-small {
                    opacity: .9;
                    font-size: 13px;
                    font-weight: 600;
                }

                .hero-title {
                    font-size: 31px;
                    line-height: 1.05;
                    margin: 9px 0 10px;
                    font-weight: 900;
                    letter-spacing: -1px;
                }

                .hero-text {
                    margin: 0;
                    max-width: 400px;
                    font-size: 14px;
                    line-height: 1.5;
                    opacity: .9;
                }

                .counter-card {
                    margin-top: 16px;
                    background: white;
                    border-radius: 28px;
                    padding: 22px 16px;
                    box-shadow: 0 12px 35px rgba(70, 30, 45, .08);
                }

                .section-title {
                    font-size: 19px;
                    font-weight: 800;
                    margin: 0 0 5px;
                }

                .section-subtitle {
                    font-size: 13px;
                    color: #9b7f89;
                    margin-bottom: 20px;
                }

                .counter-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 9px;
                }

                .counter-item {
                    background: #fff2f6;
                    border-radius: 18px;
                    padding: 14px 5px;
                    text-align: center;
                }

                .counter-number {
                    font-size: 25px;
                    font-weight: 900;
                    color: #ff477e;
                }

                .counter-label {
                    color: #987c86;
                    font-size: 11px;
                    margin-top: 4px;
                }

                .counter-bottom {
                    margin-top: 10px;
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 9px;
                }

                .quick-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 12px;
                    margin-top: 16px;
                }

                .feature {
                    background: white;
                    border: none;
                    text-align: left;
                    border-radius: 23px;
                    padding: 19px;
                    min-height: 125px;
                    box-shadow: 0 10px 28px rgba(70, 30, 45, .06);
                    transition: transform .15s ease;
                }

                .feature:active {
                    transform: scale(.97);
                }

                .feature-icon {
                    font-size: 28px;
                    margin-bottom: 12px;
                }

                .feature-title {
                    font-size: 16px;
                    font-weight: 800;
                }

                .feature-text {
                    font-size: 12px;
                    color: #9b7f89;
                    margin-top: 5px;
                    line-height: 1.4;
                }

                .page {
                    margin-top: 14px;
                }

                .page-card {
                    background: white;
                    border-radius: 26px;
                    padding: 22px;
                    box-shadow: 0 10px 30px rgba(70, 30, 45, .07);
                }

                .page-icon {
                    font-size: 40px;
                    margin-bottom: 10px;
                }

                .page-title {
                    font-size: 25px;
                    font-weight: 900;
                    margin-bottom: 7px;
                }

                .page-description {
                    color: #9b7f89;
                    line-height: 1.5;
                    font-size: 14px;
                }

                .settings-section {
                    margin-top: 14px;
                }

                .settings-card {
                    background: white;
                    border-radius: 25px;
                    padding: 20px;
                    box-shadow: 0 10px 30px rgba(70, 30, 45, .07);
                }

                .settings-label {
                    display: block;
                    font-size: 13px;
                    font-weight: 700;
                    margin-bottom: 8px;
                }

                .settings-input {
                    width: 100%;
                    border: 1px solid #eadde2;
                    border-radius: 14px;
                    padding: 13px;
                    font-size: 15px;
                    outline: none;
                    background: #fffafb;
                }

                .settings-input:focus {
                    border-color: #ff477e;
                }

                .save-button {
                    width: 100%;
                    border: none;
                    border-radius: 15px;
                    padding: 14px;
                    margin-top: 12px;
                    background: #ff477e;
                    color: white;
                    font-weight: 800;
                    font-size: 15px;
                }

                .save-message {
                    margin-top: 10px;
                    text-align: center;
                    font-size: 13px;
                    color: #ff477e;
                    font-weight: 700;
                }

                .couple-code {
                    margin-top: 14px;
                    background: #fff0f5;
                    border-radius: 18px;
                    padding: 16px;
                    text-align: center;
                }

                .couple-code-label {
                    font-size: 11px;
                    color: #a1848e;
                }

                .couple-code-value {
                    margin-top: 4px;
                    font-size: 25px;
                    font-weight: 900;
                    letter-spacing: 3px;
                    color: #ff477e;
                }

                .admin-badge {
                    display: inline-flex;
                    padding: 6px 10px;
                    border-radius: 999px;
                    background: #fff0f5;
                    color: #ff477e;
                    font-size: 11px;
                    font-weight: 800;
                    margin-top: 8px;
                }

                .bottom-nav {
                    position: fixed;
                    z-index: 50;
                    bottom: 12px;
                    left: 50%;
                    transform: translateX(-50%);
                    width: min(calc(100% - 24px), 650px);
                    background: rgba(255,255,255,.95);
                    backdrop-filter: blur(18px);
                    border: 1px solid rgba(230, 210, 218, .8);
                    border-radius: 23px;
                    padding: 7px;
                    display: flex;
                    justify-content: space-around;
                    box-shadow: 0 12px 35px rgba(50,20,35,.15);
                }

                .nav-button {
                    flex: 1;
                    border: none;
                    background: transparent;
                    border-radius: 17px;
                    padding: 8px 3px;
                    color: #a58a94;
                    font-size: 10px;
                    font-weight: 700;
                }

                .nav-button.active {
                    background: #fff0f5;
                    color: #ff477e;
                }

                .nav-icon {
                    display: block;
                    font-size: 20px;
                    margin-bottom: 2px;
                }

                .welcome {
                    text-align: center;
                    color: #9b7f89;
                    font-size: 12px;
                    margin-top: 18px;
                    margin-bottom: 10px;
                }

                @media (min-width: 650px) {
                    .container {
                        padding: 0 20px;
                    }

                    .quick-grid {
                        grid-template-columns: repeat(4, 1fr);
                    }

                    .counter-grid {
                        grid-template-columns: repeat(6, 1fr);
                    }

                    .counter-bottom {
                        display: none;
                    }
                }
            `}</style>

            <header className="topbar">
                <div className="brand">
                    <div className="brand-heart">❤️</div>

                    <div>
                        <div className="brand-title">
                            My Couple
                        </div>

                        <div className="brand-subtitle">
                            тільки для нас двох
                        </div>
                    </div>
                </div>

                <button
                    className="profile-button"
                    onClick={() => navigate("settings")}
                >
                    ⚙️
                </button>
            </header>

            <main className="container">

                {activePage === "home" && (
                    <>
                        <section className="hero">
                            <div className="hero-small">
                                ❤️ Наша історія
                            </div>

                            <h1 className="hero-title">
                                Разом — краще
                            </h1>

                            <p className="hero-text">
                                Тут зберігаються наші моменти,
                                мрії, важливі дати та все,
                                що робить нашу історію особливою.
                            </p>
                        </section>

                        <section className="counter-card">
                            <h2 className="section-title">
                                Ми разом вже 💕
                            </h2>

                            <div className="section-subtitle">
                                І кожна секунда має значення
                            </div>

                            <div className="counter-grid">

                                <CounterItem
                                    number={loveTime.years}
                                    label="років"
                                />

                                <CounterItem
                                    number={loveTime.months}
                                    label="місяців"
                                />

                                <CounterItem
                                    number={loveTime.days}
                                    label="днів"
                                />

                                <CounterItem
                                    number={loveTime.hours}
                                    label="годин"
                                />

                                <CounterItem
                                    number={loveTime.minutes}
                                    label="хвилин"
                                />

                                <CounterItem
                                    number={loveTime.seconds}
                                    label="секунд"
                                />

                            </div>
                        </section>

                        <div className="quick-grid">

                            <Feature
                                icon="💕"
                                title="Наші моменти"
                                text="Фото та спогади"
                                onClick={() => navigate("moments")}
                            />

                            <Feature
                                icon="📅"
                                title="Календар"
                                text="Важливі дати"
                                onClick={() => navigate("calendar")}
                            />

                            <Feature
                                icon="💌"
                                title="Для тебе"
                                text="Наші повідомлення"
                                onClick={() => navigate("messages")}
                            />

                            <Feature
                                icon="🎁"
                                title="Наші мрії"
                                text="Плани та бажання"
                                onClick={() => navigate("dreams")}
                            />

                        </div>

                        <div className="welcome">
                            Пара: {couple.invite_code}
                        </div>
                    </>
                )}

                {activePage === "moments" && (
                    <SimplePage
                        icon="💕"
                        title="Наші моменти"
                        description="Тут ми будемо зберігати наші фотографії, спогади, побачення та особливі моменти."
                    />
                )}

                {activePage === "calendar" && (
                    <SimplePage
                        icon="📅"
                        title="Наш календар"
                        description="Тут будуть наші річниці, дні народження, побачення та інші важливі дати."
                    />
                )}

                {activePage === "messages" && (
                    <SimplePage
                        icon="💌"
                        title="Для тебе"
                        description="Місце для романтичних повідомлень, записок та сюрпризів одне для одного."
                    />
                )}

                {activePage === "dreams" && (
                    <SimplePage
                        icon="🎁"
                        title="Наші мрії"
                        description="Сюди будемо додавати спільні мрії, бажання, подорожі та плани на майбутнє."
                    />
                )}

                {activePage === "settings" && (
                    <div className="page">

                        <div className="page-card">
                            <div className="page-icon">
                                ⚙️
                            </div>

                            <div className="page-title">
                                Налаштування
                            </div>

                            <div className="page-description">
                                Тут знаходяться налаштування вашої пари.
                            </div>

                            {isAdmin && (
                                <div className="admin-badge">
                                    🔐 Ви адміністратор
                                </div>
                            )}

                            <div className="couple-code">
                                <div className="couple-code-label">
                                    Код вашої пари
                                </div>

                                <div className="couple-code-value">
                                    {couple.invite_code}
                                </div>
                            </div>
                        </div>

                        {isAdmin && (
                            <div className="settings-section">
                                <div className="settings-card">

                                    <h2 className="section-title">
                                        ⏳ Лічильник стосунків
                                    </h2>

                                    <div className="section-subtitle">
                                        Цю дату можете змінювати тільки ви
                                        як адміністратор.
                                    </div>

                                    <label className="settings-label">
                                        Дата та час початку стосунків
                                    </label>

                                    <input
                                        className="settings-input"
                                        type="datetime-local"
                                        value={relationshipDate}
                                        onChange={(e) =>
                                            setRelationshipDate(
                                                e.target.value
                                            )
                                        }
                                    />
                                    <button
                                        className="save-button"
                                        onClick={saveRelationshipDate}
                                        disabled={savingDate}
                                    >
                                        {savingDate
                                            ? "Зберігаємо..."
                                            : "❤️ Зберегти дату"}
                                    </button>

                                    {saveMessage && (
                                        <div className="save-message">
                                            {saveMessage}
                                        </div>
                                    )}

                                </div>
                            </div>
                        )}

                        {!isAdmin && (
                            <div className="settings-section">
                                <div className="settings-card">
                                    <h2 className="section-title">
                                        ❤️ Наша пара
                                    </h2>

                                    <p className="page-description">
                                        Налаштування лічильника доступні
                                        тільки адміністратору пари.
                                    </p>
                                </div>
                            </div>
                        )}

                    </div>
                )}

            </main>

            <nav className="bottom-nav">

                <NavButton
                    icon="❤️"
                    title="Головна"
                    active={activePage === "home"}
                    onClick={() => navigate("home")}
                />

                <NavButton
                    icon="💕"
                    title="Моменти"
                    active={activePage === "moments"}
                    onClick={() => navigate("moments")}
                />

                <NavButton
                    icon="📅"
                    title="Календар"
                    active={activePage === "calendar"}
                    onClick={() => navigate("calendar")}
                />

                <NavButton
                    icon="💌"
                    title="Для тебе"
                    active={activePage === "messages"}
                    onClick={() => navigate("messages")}
                />

                <NavButton
                    icon="⚙️"
                    title="Налаштування"
                    active={activePage === "settings"}
                    onClick={() => navigate("settings")}
                />

            </nav>

        </div>
    );
}

function CounterItem({ number, label }) {
    return (
        <div className="counter-item">
            <div className="counter-number">
                {formatNumber(number)}
            </div>

            <div className="counter-label">
                {label}
            </div>
        </div>
    );
}

function Feature({
    icon,
    title,
    text,
    onClick
}) {
    return (
        <button
            className="feature"
            onClick={onClick}
        >
            <div className="feature-icon">
                {icon}
            </div>

            <div className="feature-title">
                {title}
            </div>

            <div className="feature-text">
                {text}
            </div>
        </button>
    );
}

function NavButton({
    icon,
    title,
    active,
    onClick
}) {
    return (
        <button
            className={`nav-button ${active ? "active" : ""}`}
            onClick={onClick}
        >
            <span className="nav-icon">
                {icon}
            </span>

            {title}
        </button>
    );
}function SimplePage({
    icon,
    title,
    description
}) {
    return (
        <div className="page">

            <div className="page-card">

                <div className="page-icon">
                    {icon}
                </div>

                <div className="page-title">
                    {title}
                </div>

                <div className="page-description">
                    {description}
                </div>

            </div>

        </div>
    );
}

async function startApp() {

    if (!supabase) {
        document.body.innerHTML = `
            <div style="
                padding:30px;
                font-family:Arial;
                text-align:center;
            ">
                ❌ Supabase не завантажився
            </div>
        `;

        return;
    }

    const {
        data: sessionData,
        error: sessionError
    } = await supabase.auth.getSession();

    if (sessionError) {
        console.error(sessionError);
    }

    const session = sessionData?.session;

    if (!session) {
        document.body.innerHTML = `
            <div style="
                min-height:100vh;
                display:flex;
                align-items:center;
                justify-content:center;
                padding:25px;
                font-family:Arial;
                text-align:center;
                background:#fff7fa;
            ">
                <div>
                    <div style="font-size:55px;">❤️</div>

                    <h2>
                        My Couple
                    </h2>

                    <p>
                        Спочатку потрібно увійти
                        у свій акаунт.
                    </p>

                    <a
                        href="/login.html"
                        style="
                            display:inline-block;
                            margin-top:15px;
                            padding:13px 25px;
                            background:#ff477e;
                            color:white;
                            text-decoration:none;
                            border-radius:14px;
                            font-weight:bold;
                        "
                    >
                        Увійти ❤️
                    </a>
                </div>
            </div>
        `;

        return;
    }

    const user = session.user;
    // ---------------------------------------
    // PROFILE
    // ---------------------------------------

    let {
        data: profile,
        error: profileError
    } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

    if (profileError) {
        console.error("Profile error:", profileError);
    }

    // ---------------------------------------
    // COUPLE MEMBERSHIP
    // ---------------------------------------

    let {
        data: membership,
        error: membershipError
    } = await supabase
        .from("couple_members")
        .select("couple_id")
        .eq("user_id", user.id)
        .maybeSingle();

    if (membershipError) {
        console.error(
            "Membership error:",
            membershipError
        );
    }

    let coupleId = membership?.couple_id;
    let inviteCode = null;

    // ---------------------------------------
    // IF USER DOESN'T HAVE COUPLE
    // ---------------------------------------

    if (!coupleId) {

        const inviteCodeFromUser =
            user.user_metadata?.invite_code
                ?.trim()
                .toUpperCase();

        if (inviteCodeFromUser) {

            const {
                data,
                error
            } = await supabase.rpc(
                "join_couple",
                {
                    entered_invite_code:
                        inviteCodeFromUser
                }
            );

            if (error) {
                console.error(
                    "Join couple error:",
                    error
                );

                document.body.innerHTML = `
                    <div style="
                        padding:30px;
                        font-family:Arial;
                        text-align:center;
                    ">
                        <div style="font-size:50px;">
                            😔
                        </div>

                        <h2>
                            Не вдалося приєднатися
                        </h2>

                        <p>
                            Код пари неправильний
                            або пара вже заповнена.
                        </p>
                    </div>
                `;

                return;
            }
            coupleId = data.couple_id;
            inviteCode = data.invite_code;

        } else {

            const {
                data,
                error
            } = await supabase.rpc(
                "create_couple"
            );

            if (error) {
                console.error(
                    "Create couple error:",
                    error
                );

                document.body.innerHTML = `
                    <div style="
                        padding:30px;
                        font-family:Arial;
                        text-align:center;
                    ">
                        ❌ Не вдалося створити пару
                    </div>
                `;

                return;
            }

            coupleId = data.couple_id;
            inviteCode = data.invite_code;
        }
    }

    // ---------------------------------------
    // COUPLE
    // ---------------------------------------

    const {
        data: couple,
        error: coupleError
    } = await supabase
        .from("couples")
        .select("*")
        .eq("id", coupleId)
        .single();

    if (coupleError) {
        console.error(
            "Couple error:",
            coupleError
        );

        return;
    }

    if (!inviteCode) {
        inviteCode = couple.invite_code;
    }

    // ---------------------------------------
    // SETTINGS
    // ---------------------------------------

    let {
        data: settings,
        error: settingsError
    } = await supabase
        .from("couple_settings")
        .select("*")
        .eq("couple_id", coupleId)
        .maybeSingle();

    if (settingsError) {
        console.error(
            "Settings error:",
            settingsError
        );
    }// ---------------------------------------
    // CREATE SETTINGS IF ADMIN
    // ---------------------------------------

    if (!settings && profile?.role === "admin") {

        const {
            data: newSettings,
            error: createSettingsError
        } = await supabase
            .from("couple_settings")
            .insert({
                couple_id: coupleId,
                relationship_started_at:
                    new Date().toISOString(),
                updated_at:
                    new Date().toISOString()
            })
            .select()
            .single();

        if (createSettingsError) {
            console.error(
                "Create settings error:",
                createSettingsError
            );
        } else {
            settings = newSettings;
        }
    }

    if (!settings) {
        settings = {
            ...DEFAULT_SETTINGS
        };
    }

    // ---------------------------------------
    // REACT STATE
    // ---------------------------------------

    const rootElement =
        document.getElementById("root");

    if (!rootElement) {
        console.error(
            "❌ #root не знайдено в index.html"
        );

        return;
    }

    function RootApp() {

        const [
            currentSettings,
            setCurrentSettings
        ] = useState(settings);

        return (
            <App
                user={user}
                profile={profile}
                couple={{
                    ...couple,
                    invite_code: inviteCode
                }}
                settings={currentSettings}
                onSettingsChange={
                    setCurrentSettings
                }
            />
        );
    }

    createRoot(rootElement).render(
        <RootApp />
    );
}

startApp();
