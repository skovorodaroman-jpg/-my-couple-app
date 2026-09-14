import React, {
    useEffect,
    useState
} from "react";

import { createRoot } from "react-dom/client";
const supabase = window.supabaseClient;

function getLoveTime(startDate) {
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

    const totalMs = now - start;
    const totalSeconds = Math.max(
        0,
        Math.floor(totalMs / 1000)
    );

    const seconds = totalSeconds % 60;
    const minutes =
        Math.floor(totalSeconds / 60) % 60;
    const hours =
        Math.floor(totalSeconds / 3600) % 24;

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

function App() {
    const [session, setSession] = useState(null);
    const [profile, setProfile] = useState(null);
    const [couple, setCouple] = useState(null);
    const [settings, setSettings] = useState(null);

    const [page, setPage] = useState("home");
    const [loveTime, setLoveTime] = useState(null);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [startDate, setStartDate] = useState("");
    const [partnerName, setPartnerName] = useState("Даша");

    useEffect(() => {
        loadApp();

        const {
            data: listener
        } = supabase.auth.onAuthStateChange(
            (_event, newSession) => {
                setSession(newSession);
            }
        );

        return () => {
            listener.subscription.unsubscribe();
        };
    }, []);

    useEffect(() => {
        if (!settings?.relationship_started_at) {
            return;
        }

        const updateCounter = () => {
            setLoveTime(
                getLoveTime(
                    settings.relationship_started_at
                )
            );
        };

        updateCounter();

        const interval = setInterval(
            updateCounter,
            1000
        );

        return () => clearInterval(interval);
    }, [settings]);

    async function loadApp() {
        try {
            setLoading(true);

            const {
                data: {
                    session: currentSession
                }
            } = await supabase.auth.getSession();

            if (!currentSession) {
                setLoading(false);
                return;
            }

            setSession(currentSession);

            const {
                data: profileData,
                error: profileError
            } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", currentSession.user.id)
                .single();

            if (profileError) {
                console.error(profileError);
            }

            setProfile(profileData);

            const {
                data: memberData,
                error: memberError
            } = await supabase
                .from("couple_members")
                .select("couple_id")
                .eq(
                    "user_id",
                    currentSession.user.id
                )
                .single();

            if (memberError || !memberData) {
                console.error(memberError);
                setLoading(false);
                return;
            }

            const {
                data: coupleData,
                error: coupleError
            } = await supabase
                .from("couples")
                .select("*")
                .eq(
                    "id",
                    memberData.couple_id
                )
                .single();

            if (coupleError) {
                console.error(coupleError);
            }

            setCouple(coupleData);

            let {
                data: settingsData
            } = await supabase
                .from("couple_settings")
                .select("*")
                .eq(
                    "couple_id",
                    memberData.couple_id
                )
                .maybeSingle();

            if (
                !settingsData &&
                profileData?.role === "admin"
            ) {
                const {
                    data: newSettings,
                    error: insertError
                } = await supabase
                    .from("couple_settings")
                    .insert({
                        couple_id:
                            memberData.couple_id,
                        partner_name: "Даша"
                    })
                    .select()
                    .single();

                if (insertError) {
                    console.error(
                        insertError
                    );
                } else {
                    settingsData = newSettings;
                }
            }

            setSettings(settingsData);

            if (settingsData?.partner_name) {
                setPartnerName(
                    settingsData.partner_name
                );
            }

            if (
                settingsData
                    ?.relationship_started_at
            ) {
                const date =
                    new Date(
                        settingsData
                            .relationship_started_at
                    );

                const localDate =
                    new Date(
                        date.getTime() -
                        date.getTimezoneOffset()
                        * 60000
                    )
                    .toISOString()
                    .slice(0, 16);

                setStartDate(localDate);
            }

        } catch (error) {
            console.error(
                "Помилка завантаження:",
                error
            );
        } finally {
            setLoading(false);
        }
    }

    async function saveSettings(event) {
        event.preventDefault();

        if (!couple || !startDate) {
            return;
        }

        try {
            setSaving(true);

            const updatedSettings = {
                couple_id: couple.id,
                relationship_started_at:
                    new Date(
                        startDate
                    ).toISOString(),
                partner_name:
                    partnerName.trim() ||
                    "Даша",
                updated_at:
                    new Date().toISOString()
            };

            const {
                error
            } = await supabase
                .from("couple_settings")
                .upsert(
                    updatedSettings
                );

            if (error) {
                throw error;
            }

            setSettings(
                updatedSettings
            );

            setPartnerName(
                updatedSettings.partner_name
            );

            alert(
                "❤️ Налаштування збережено!"
            );

        } catch (error) {
            console.error(error);

            alert(
                "❌ Не вдалося зберегти налаштування."
            );
        } finally {
            setSaving(false);
        }
    }

    async function logout() {
        await supabase.auth.signOut();

        window.location.href =
            "/login.html";
    }

    if (loading) {
        return (
            <div style={styles.loading}>
                <div style={styles.loadingHeart}>
                    ❤️
                </div>

                <div>
                    Завантажуємо наше кохання...
                </div>
            </div>
        );
    }

    if (!session) {
        return (
            <div style={styles.loading}>
                <div style={styles.loadingHeart}>
                    🔐
                </div>

                <h2>
                    Потрібно увійти
                </h2>

                <button
                    style={styles.primaryButton}
                    onClick={() => {
                        window.location.href =
                            "/login.html";
                    }}
                >
                    Увійти ❤️
                </button>
            </div>
        );
    }

    const isAdmin =
        profile?.role === "admin";

    return (
        <div style={styles.app}>
            <header style={styles.header}>
                <div>
                    <div style={styles.logo}>
                        My Couple
                    </div>

                    <div style={styles.subtitle}>
                        наше маленьке місце ❤️
                    </div>
                </div>

                <button
                    style={styles.settingsButton}
                    onClick={() =>
                        setPage("settings")
                    }
                >
                    ⚙️
                </button>
            </header>

            <main style={styles.content}>
                {page === "home" && (
                    <HomePage
                        profile={profile}
                        couple={couple}
                        partnerName={partnerName}
                        loveTime={loveTime}
                        setPage={setPage}
                    />
                )}

                {page === "moments" && (
                    <MomentsPage />
                )}

                {page === "calendar" && (
                    <CalendarPage />
                )}

                {page === "dreams" && (
                    <DreamsPage />
                )}

                {page === "settings" && (
                    <SettingsPage
                        profile={profile}
                        couple={couple}
                        isAdmin={isAdmin}
                        startDate={startDate}
                        setStartDate={
                            setStartDate
                        }
                        partnerName={partnerName}
                        setPartnerName={
                            setPartnerName
                        }
                        saveSettings={
                            saveSettings
                        }
                        saving={saving}
                        logout={logout}
                    />
                )}
            </main>

            <nav style={styles.bottomNav}>
                <button
                    style={{
                        ...styles.navButton,
                        ...(page === "home"
                            ? styles.navActive
                            : {})
                    }}
                    onClick={() =>
                        setPage("home")
                    }
                >
                    <span>❤️</span>
                    <small>Головна</small>
                </button>

                <button
                    style={{
                        ...styles.navButton,
                        ...(page === "moments"
                            ? styles.navActive
                            : {})
                    }}
                    onClick={() =>
                        setPage("moments")
                    }
                >
                    <span>📸</span>
                    <small>Моменти</small>
                </button>

                <button
                    style={{
                        ...styles.navButton,
                        ...(page === "calendar"
                            ? styles.navActive
                            : {})
                    }}
                    onClick={() =>
                        setPage("calendar")
                    }
                >
                    <span>📅</span>
                    <small>Календар</small>
                </button>

                <button
                    style={{
                        ...styles.navButton,
                        ...(page === "dreams"
                            ? styles.navActive
                            : {})
                    }}
                    onClick={() =>
                        setPage("dreams")
                    }
                >
                    <span>✨</span>
                    <small>Мрії</small>
                </button>

                <button
                    style={{
                        ...styles.navButton,
                        ...(page === "settings"
                            ? styles.navActive
                            : {})
                    }}
                    onClick={() =>
                        setPage("settings")
                    }
                >
                    <span>⚙️</span>
                    <small>Налаштування</small>
                </button>
            </nav>
        </div>
    );
        }
function HomePage({
    profile,
    couple,
    partnerName,
    loveTime,
    setPage
}) {
    const userName =
        profile?.name || "Рома";

    return (
        <div>
            <section style={styles.hero}>
                <div style={styles.heroDecor}>
                    ❤️
                </div>

                <p style={styles.eyebrow}>
                    НАША ІСТОРІЯ
                </p>

                <h1 style={styles.heroTitle}>
                    Разом — це
                    <br />
                    найкраще ❤️
                </h1>

                <p style={styles.heroText}>
                    Кожен день поруч —
                    ще одна маленька
                    історія нашого кохання.
                </p>

                <div style={styles.names}>
                    {userName}
                    <span> ❤️ </span>
                    {partnerName || "Даша"}
                </div>
            </section>

            <section style={styles.counterCard}>
                <div style={styles.counterTitle}>
                    Ми разом вже
                </div>

                {loveTime ? (
                    <div style={styles.counterGrid}>
                        <CounterItem
                            value={loveTime.years}
                            label="років"
                        />

                        <CounterItem
                            value={loveTime.months}
                            label="місяців"
                        />

                        <CounterItem
                            value={loveTime.days}
                            label="днів"
                        />

                        <CounterItem
                            value={loveTime.hours}
                            label="годин"
                        />

                        <CounterItem
                            value={loveTime.minutes}
                            label="хвилин"
                        />

                        <CounterItem
                            value={loveTime.seconds}
                            label="секунд"
                        />
                    </div>
                ) : (
                    <div style={styles.noCounter}>
                        ❤️
                    </div>
                )}

                <div style={styles.counterHeart}>
                    ❤️
                </div>
            </section>

            <section>
                <div style={styles.sectionHeader}>
                    <div>
                        <p style={styles.sectionSmall}>
                            НАШЕ
                        </p>

                        <h2 style={styles.sectionTitle}>
                            Все наше ❤️
                        </h2>
                    </div>
                </div>

                <div style={styles.cardsGrid}>
                    <FeatureCard
                        icon="📸"
                        title="Наші моменти"
                        text="Фото та спогади"
                        onClick={() =>
                            setPage("moments")
                        }
                    />

                    <FeatureCard
                        icon="📅"
                        title="Календар"
                        text="Важливі дати"
                        onClick={() =>
                            setPage("calendar")
                        }
                    />

                    <FeatureCard
                        icon="✨"
                        title="Наші мрії"
                        text="Те, що здійснимо разом"
                        onClick={() =>
                            setPage("dreams")
                        }
                    />

                    <FeatureCard
                        icon="💌"
                        title="Для тебе"
                        text="Маленькі сюрпризи"
                        onClick={() =>
                            alert(
                                "💌 Скоро тут буде щось особливе!"
                            )
                        }
                    />
                </div>
            </section>

            <section style={styles.quoteCard}>
                <div style={styles.quoteHeart}>
                    💕
                </div>

                <p style={styles.quote}>
                    "Найкраще місце
                    <br />
                    — поруч із тобою."
                </p>

                <div style={styles.quoteLine}>
                    ─────────
                </div>

                <p style={styles.quoteBottom}>
                    Наша історія тільки починається ❤️
                </p>
            </section>

            {couple?.invite_code && (
                <section style={styles.codeCard}>
                    <div style={styles.codeIcon}>
                        🔐
                    </div>

                    <div>
                        <div style={styles.codeLabel}>
                            КОД НАШОЇ ПАРИ
                        </div>

                        <div style={styles.codeValue}>
                            {couple.invite_code}
                        </div>
                    </div>
                </section>
            )}
        </div>
    );
}

function CounterItem({
    value,
    label
}) {
    return (
        <div style={styles.counterItem}>
            <div style={styles.counterNumber}>
                {formatNumber(value)}
            </div>

            <div style={styles.counterLabel}>
                {label}
            </div>
        </div>
    );
}

function FeatureCard({
    icon,
    title,
    text,
    onClick
}) {
    return (
        <button
            style={styles.featureCard}
            onClick={onClick}
        >
            <div style={styles.featureIcon}>
                {icon}
            </div>

            <div style={styles.featureTitle}>
                {title}
            </div>

            <div style={styles.featureText}>
                {text}
            </div>

            <div style={styles.featureArrow}>
                →
            </div>
        </button>
    );
}

function MomentsPage() {
    return (
        <PageWrapper
            icon="📸"
            title="Наші моменти"
            subtitle="Найкращі спогади разом"
        >
            <EmptyState
                icon="📷"
                title="Тут будуть наші фото"
                text="Додамо можливість завантажувати та зберігати ваші спільні моменти."
            />
        </PageWrapper>
    );
}

function CalendarPage() {
    return (
        <PageWrapper
            icon="📅"
            title="Наш календар"
            subtitle="Важливі дати нашої історії"
        >
            <div style={styles.infoCard}>
                <div style={styles.bigEmoji}>
                    ❤️
                </div>

                <h3 style={styles.infoTitle}>
                    Наші важливі дати
                </h3>

                <p style={styles.infoText}>
                    Тут зможемо додавати
                    річниці, дні народження,
                    побачення та інші особливі
                    моменти.
                </p>
            </div>
        </PageWrapper>
    );
}

function DreamsPage() {
    return (
        <PageWrapper
            icon="✨"
            title="Наші мрії"
            subtitle="Те, що ми хочемо здійснити"
        >
            <EmptyState
                icon="🌙"
                title="Мрії попереду"
                text="Тут буде наш спільний список мрій та цілей."
            />
        </PageWrapper>
    );
}

function PageWrapper({
    icon,
    title,
    subtitle,
    children
}) {
    return (
        <div>
            <section style={styles.pageHeader}>
                <div style={styles.pageIcon}>
                    {icon}
                </div>

                <h1 style={styles.pageTitle}>
                    {title}
                </h1>

                <p style={styles.pageSubtitle}>
                    {subtitle}
                </p>
            </section>

            {children}
        </div>
    );
}

function EmptyState({
    icon,
    title,
    text
}) {
    return (
        <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>
                {icon}
            </div>

            <h3 style={styles.emptyTitle}>
                {title}
            </h3>

            <p style={styles.emptyText}>
                {text}
            </p>
        </div>
    );
}

function SettingsPage({
    profile,
    couple,
    isAdmin,
    startDate,
    setStartDate,
    partnerName,
    setPartnerName,
    saveSettings,
    saving,
    logout
}) {
    return (
        <div>
            <section style={styles.pageHeader}>
                <div style={styles.pageIcon}>
                    ⚙️
                </div>

                <h1 style={styles.pageTitle}>
                    Налаштування
                </h1>

                <p style={styles.pageSubtitle}>
                    Налаштування нашої пари
                </p>
            </section>

            {isAdmin ? (
                <section style={styles.settingsCard}>
                    <div style={styles.settingsTop}>
                        <div style={styles.settingsIcon}>
                            👑
                        </div>

                        <div>
                            <h2 style={styles.settingsTitle}>
                                Налаштування адміністратора
                            </h2>

                            <p style={styles.settingsText}>
                                Тільки адміністратор може змінювати ці налаштування.
                            </p>
                        </div>
                    </div>

                    <form
                        onSubmit={saveSettings}
                        style={styles.form}
                    >
                        <label style={styles.label}>
                            ❤️ Початок наших стосунків
                        </label>

                        <input
                            type="datetime-local"
                            value={startDate}
                            onChange={(event) =>
                                setStartDate(
                                    event.target.value
                                )
                            }
                            style={styles.input}
                            required
                        />

                        <label style={styles.label}>
                            👩 Ім'я коханої
                        </label>

                        <input
                            type="text"
                            value={partnerName}
                            onChange={(event) =>
                                setPartnerName(
                                    event.target.value
                                )
                            }
                            placeholder="Наприклад: Даша"
                            style={styles.input}
                            maxLength={40}
                            required
                        />

                        <button
                            type="submit"
                            style={styles.primaryButton}
                            disabled={saving}
                        >
                            {saving
                                ? "Зберігаємо..."
                                : "Зберегти ❤️"}
                        </button>
                    </form>
                </section>
            ) : (
                <section style={styles.infoCard}>
                    <div style={styles.bigEmoji}>
                        🔒
                    </div>

                    <h3 style={styles.infoTitle}>
                        Налаштування доступні адміну
                    </h3>

                    <p style={styles.infoText}>
                        Дату початку стосунків та інші важливі параметри може змінювати тільки адміністратор.
                    </p>
                </section>
            )}

            <section style={styles.accountCard}>
                <div style={styles.accountTitle}>
                    👤 Мій профіль
                </div>

                <div style={styles.accountRow}>
                    <span>Ім'я</span>
                    <strong>
                        {profile?.name || "Користувач"}
                    </strong>
                </div>

                <div style={styles.accountRow}>
                    <span>Роль</span>
                    <strong>
                        {isAdmin
                            ? "👑 Адміністратор"
                            : "❤️ Учасник пари"}
                    </strong>
                </div>

                <div style={styles.accountRow}>
                    <span>Кохана</span>
                    <strong>
                        {partnerName || "Даша"}
                    </strong>
                </div>

                {couple?.invite_code && (
                    <div style={styles.accountRow}>
                        <span>Код пари</span>
                        <strong>
                            {couple.invite_code}
                        </strong>
                    </div>
                )}
            </section>

            <button
                style={styles.logoutButton}
                onClick={logout}
            >
                Вийти з акаунта
            </button>
        </div>
    );
                            }
const styles = {
    app: {
        minHeight: "100vh",
        background:
            "linear-gradient(180deg,#fff7fa 0%,#fff 55%,#fff8fb 100%)",
        color: "#3b2630",
        fontFamily:
            "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
        paddingBottom: "90px"
    },

    loading: {
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        gap: "14px",
        background: "#fff7fa",
        color: "#5b3542",
        fontSize: "17px",
        padding: "20px",
        textAlign: "center"
    },

    loadingHeart: {
        fontSize: "52px"
    },

    header: {
        position: "sticky",
        top: 0,
        zIndex: 20,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "18px 18px 14px",
        background:
            "rgba(255,255,255,.92)",
        backdropFilter: "blur(12px)",
        borderBottom:
            "1px solid rgba(210,150,170,.15)"
    },

    logo: {
        fontSize: "24px",
        fontWeight: "800",
        letterSpacing: "-.7px",
        color: "#5b3040"
    },

    subtitle: {
        fontSize: "12px",
        marginTop: "2px",
        color: "#a77b88"
    },

    settingsButton: {
        width: "44px",
        height: "44px",
        border: "none",
        borderRadius: "50%",
        background: "#fff0f4",
        fontSize: "20px",
        cursor: "pointer",
        boxShadow:
            "0 5px 18px rgba(130,70,90,.10)"
    },

    content: {
        width: "100%",
        maxWidth: "760px",
        margin: "0 auto",
        padding: "18px 16px 25px",
        boxSizing: "border-box"
    },

    hero: {
        position: "relative",
        overflow: "hidden",
        borderRadius: "30px",
        padding: "30px 24px",
        marginBottom: "18px",
        background:
            "linear-gradient(135deg,#ffe7ee,#fff1f5 55%,#fff)",
        boxShadow:
            "0 14px 40px rgba(150,75,100,.10)"
    },

    heroDecor: {
        position: "absolute",
        right: "-5px",
        top: "-15px",
        fontSize: "105px",
        opacity: ".14",
        transform: "rotate(12deg)"
    },

    eyebrow: {
        position: "relative",
        margin: 0,
        color: "#b56b82",
        fontSize: "11px",
        fontWeight: "800",
        letterSpacing: "2px"
    },

    heroTitle: {
        position: "relative",
        margin: "10px 0",
        fontSize: "34px",
        lineHeight: "1.08",
        letterSpacing: "-1.2px",
        color: "#542d3a"
    },

    heroText: {
        position: "relative",
        maxWidth: "470px",
        margin: "0 0 18px",
        lineHeight: "1.55",
        fontSize: "14px",
        color: "#8d6672"
    },

    names: {
        position: "relative",
        display: "inline-block",
        padding: "9px 14px",
        borderRadius: "100px",
        background: "rgba(255,255,255,.72)",
        color: "#754253",
        fontWeight: "700",
        fontSize: "14px"
    },

    counterCard: {
        position: "relative",
        overflow: "hidden",
        padding: "22px 14px 20px",
        marginBottom: "28px",
        borderRadius: "28px",
        background: "#fff",
        border: "1px solid #f4dfe6",
        boxShadow:
            "0 12px 35px rgba(140,70,90,.08)",
        textAlign: "center"
    },

    counterTitle: {
        color: "#9b7180",
        fontSize: "13px",
        fontWeight: "700",
        marginBottom: "16px"
    },

    counterGrid: {
        display: "grid",
        gridTemplateColumns:
            "repeat(3,1fr)",
        gap: "10px"
    },

    counterItem: {
        padding: "9px 3px"
    },

    counterNumber: {
        fontSize: "25px",
        fontWeight: "800",
        color: "#653545",
        lineHeight: "1.1"
    },

    counterLabel: {
        marginTop: "4px",
        fontSize: "10px",
        color: "#ad8995",
        fontWeight: "600"
    },

    counterHeart: {
        position: "absolute",
        right: "13px",
        bottom: "9px",
        fontSize: "18px",
        opacity: ".6"
    },

    noCounter: {
        fontSize: "40px",
        padding: "20px"
    },

    sectionHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "end",
        marginBottom: "14px"
    },

    sectionSmall: {
        margin: 0,
        fontSize: "10px",
        letterSpacing: "2px",
        fontWeight: "800",
        color: "#bb8193"
    },

    sectionTitle: {
        margin: "3px 0 0",
        fontSize: "25px",
        color: "#56313e",
        letterSpacing: "-.6px"
    },

    cardsGrid: {
        display: "grid",
        gridTemplateColumns:
            "repeat(2,minmax(0,1fr))",
        gap: "12px"
    },

    featureCard: {
        position: "relative",
        textAlign: "left",
        border: "1px solid #f3e0e6",
        borderRadius: "23px",
        background: "#fff",
        padding: "18px 16px 20px",
        minHeight: "145px",
        cursor: "pointer",
        boxShadow:
            "0 8px 25px rgba(140,70,90,.06)"
    },

    featureIcon: {
        width: "44px",
        height: "44px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "15px",
        background: "#fff0f4",
        fontSize: "23px",
        marginBottom: "14px"
    },

    featureTitle: {
        fontWeight: "800",
        color: "#5c3542",
        fontSize: "15px"
    },

    featureText: {
        marginTop: "4px",
        color: "#a17d89",
        fontSize: "11px",
        lineHeight: "1.4"
    },

    featureArrow: {
        position: "absolute",
        right: "14px",
        bottom: "13px",
        color: "#d18aa0",
        fontSize: "18px"
    },

    quoteCard: {
        marginTop: "18px",
        padding: "28px 20px",
        textAlign: "center",
        borderRadius: "27px",
        background:
            "linear-gradient(135deg,#fff0f4,#fff8fa)",
        border: "1px solid #f5dfe7"
    },

    quoteHeart: {
        fontSize: "27px",
        marginBottom: "7px"
    },

    quote: {
        margin: 0,
        fontSize: "19px",
        lineHeight: "1.45",
        fontWeight: "700",
        color: "#693847"
    },

    quoteLine: {
        margin: "12px 0",
        color: "#e2a7b8",
        fontSize: "10px"
    },

    quoteBottom: {
        margin: 0,
        fontSize: "11px",
        color: "#a67c89"
    },

    codeCard: {
        display: "flex",
        alignItems: "center",
        gap: "13px",
        marginTop: "14px",
        padding: "16px",
        borderRadius: "20px",
        background: "#fff",
        border: "1px solid #f2e0e6"
    },

    codeIcon: {
        width: "42px",
        height: "42px",
        borderRadius: "13px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f8f0ff",
        fontSize: "20px"
    },

    codeLabel: {
        fontSize: "9px",
        color: "#a48691",
        fontWeight: "800",
        letterSpacing: "1.2px"
    },

    codeValue: {
        marginTop: "3px",
        fontSize: "18px",
        fontWeight: "800",
        letterSpacing: "2px",
        color: "#623746"
    },

    pageHeader: {
        textAlign: "center",
        padding: "15px 5px 25px"
    },

    pageIcon: {
        fontSize: "39px",
        marginBottom: "8px"
    },

    pageTitle: {
        margin: 0,
        fontSize: "29px",
        color: "#58323f",
        letterSpacing: "-.7px"
    },

    pageSubtitle: {
        margin: "6px 0 0",
        color: "#a27b88",
        fontSize: "13px"
    },

    emptyState: {
        textAlign: "center",
        padding: "45px 25px",
        borderRadius: "27px",
        background: "#fff",
        border: "1px solid #f2e0e6",
        boxShadow:
            "0 10px 30px rgba(140,70,90,.05)"
    },

    emptyIcon: {
        fontSize: "52px",
        marginBottom: "12px"
    },

    emptyTitle: {
        margin: 0,
        fontSize: "19px",
        color: "#633847"
    },

    emptyText: {
        maxWidth: "430px",
        margin: "8px auto 0",
        color: "#a07c88",
        lineHeight: "1.55",
        fontSize: "13px"
    },

    infoCard: {
        padding: "30px 22px",
        textAlign: "center",
        borderRadius: "27px",
        background: "#fff",
        border: "1px solid #f2e0e6",
        boxShadow:
            "0 10px 30px rgba(140,70,90,.05)"
    },

    bigEmoji: {
        fontSize: "45px",
        marginBottom: "10px"
    },

    infoTitle: {
        margin: 0,
        color: "#613645",
        fontSize: "19px"
    },

    infoText: {
        margin: "9px auto 0",
        maxWidth: "500px",
        color: "#9d7985",
        lineHeight: "1.55",
        fontSize: "13px"
    },

    settingsCard: {
        padding: "21px",
        borderRadius: "25px",
        background: "#fff",
        border: "1px solid #f0dce4",
        boxShadow:
            "0 10px 30px rgba(140,70,90,.06)"
    },

    settingsTop: {
        display: "flex",
        gap: "13px",
        alignItems: "flex-start",
        marginBottom: "22px"
    },

    settingsIcon: {
        flexShrink: 0,
        width: "47px",
        height: "47px",
        borderRadius: "15px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#fff0cf",
        fontSize: "23px"
    },

    settingsTitle: {
        margin: 0,
        color: "#5d3542",
        fontSize: "17px"
    },

    settingsText: {
        margin: "5px 0 0",
        color: "#a17c89",
        fontSize: "12px",
        lineHeight: "1.45"
    },

    form: {
        display: "flex",
        flexDirection: "column",
        gap: "9px"
    },

    label: {
        color: "#704150",
        fontSize: "13px",
        fontWeight: "700"
    },

    input: {
        width: "100%",
        boxSizing: "border-box",
        padding: "13px 14px",
        borderRadius: "14px",
        border: "1px solid #ead5dd",
        background: "#fffafb",
        color: "#593440",
        fontSize: "14px",
        outline: "none"
    },

    primaryButton: {
        marginTop: "5px",
        width: "100%",
        border: "none",
        borderRadius: "15px",
        padding: "14px 18px",
        background:
            "linear-gradient(135deg,#d96f8f,#bd5878)",
        color: "#fff",
        fontSize: "14px",
        fontWeight: "800",
        cursor: "pointer",
        boxShadow:
            "0 8px 20px rgba(190,80,115,.22)"
    },

    accountCard: {
        marginTop: "14px",
        padding: "19px",
        borderRadius: "23px",
        background: "#fff",
        border: "1px solid #f1dfe5"
    },

    accountTitle: {
        marginBottom: "13px",
        color: "#613645",
        fontSize: "16px",
        fontWeight: "800"
    },

    accountRow: {
        display: "flex",
        justifyContent: "space-between",
        gap: "12px",
        padding: "10px 0",
        borderTop: "1px solid #f7e9ed",
        fontSize: "13px",
        color: "#a07d88"
    },

    logoutButton: {
        width: "100%",
        marginTop: "15px",
        padding: "13px",
        borderRadius: "15px",
        border: "1px solid #f0cbd5",
        background: "#fff",
        color: "#b74f6d",
        fontWeight: "700",
        cursor: "pointer"
    },

    bottomNav: {
        position: "fixed",
        zIndex: 30,
        bottom: 0,
        left: 0,
        right: 0,
        height: "70px",
        display: "flex",
        justifyContent: "center",
        gap: "2px",
        padding: "5px",
        boxSizing: "border-box",
        background:
            "rgba(255,255,255,.96)",
        backdropFilter: "blur(14px)",
        borderTop:
            "1px solid rgba(210,150,170,.18)",
        boxShadow:
            "0 -5px 25px rgba(100,50,70,.07)"
    },

    navButton: {
        flex: 1,
        maxWidth: "100px",
        border: "none",
        background: "transparent",
        borderRadius: "14px",
        color: "#a88a94",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "3px"
    },

    navActive: {
        background: "#fff0f4",
        color: "#b85876"
    }
};
const rootElement =
    document.getElementById("root");

if (!rootElement) {
    console.error("❌ Не знайдено елемент #root");
} else {
    createRoot(rootElement).render(
        <App />
    );
}
