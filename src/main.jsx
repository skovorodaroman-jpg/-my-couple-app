import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

const supabase = window.supabaseClient;

function getLoveTime(startDate) {
  const start = new Date(startDate);
  const now = new Date();
  if (isNaN(start.getTime())) return { years: 0, months: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
  let years = now.getFullYear() - start.getFullYear();
  let months = now.getMonth() - start.getMonth();
  let days = now.getDate() - start.getDate();
  if (days < 0) {
    months--;
    days += new Date(now.getFullYear(), now.getMonth(), 0).getDate();
  }
  if (months < 0) { years--; months += 12; }
  const totalSeconds = Math.max(0, Math.floor((now - start) / 1000));
  return { years, months, days, hours: Math.floor(totalSeconds / 3600) % 24, minutes: Math.floor(totalSeconds / 60) % 60, seconds: totalSeconds % 60 };
}

const pad = n => String(n).padStart(2, "0");

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
  const [moments, setMoments] = useState([]);
  const [momentLoading, setMomentLoading] = useState(false);

  useEffect(() => {
    loadApp();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => setSession(newSession));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!settings?.relationship_started_at) return;
    const update = () => setLoveTime(getLoveTime(settings.relationship_started_at));
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [settings]);

  useEffect(() => {
    if (couple?.id) loadMoments(couple.id);
    else setMoments([]);
  }, [couple]);

  async function loadApp() {
    try {
      setLoading(true);
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession) return;
      setSession(currentSession);

      const { data: profileData, error: profileError } = await supabase.from("profiles").select("*").eq("id", currentSession.user.id).single();
      if (profileError) console.error(profileError);
      setProfile(profileData);

      const { data: memberData, error: memberError } = await supabase.from("couple_members").select("couple_id").eq("user_id", currentSession.user.id).single();
      if (memberError || !memberData) { console.error(memberError); return; }

      const { data: coupleData, error: coupleError } = await supabase.from("couples").select("*").eq("id", memberData.couple_id).single();
      if (coupleError) console.error(coupleError);
      setCouple(coupleData);

      let { data: settingsData, error: settingsError } = await supabase.from("couple_settings").select("*").eq("couple_id", memberData.couple_id).maybeSingle();
      if (settingsError) console.error(settingsError);

      if (!settingsData && profileData?.role === "admin") {
        const { data: newSettings, error: insertError } = await supabase.from("couple_settings").insert({ couple_id: memberData.couple_id, partner_name: "Даша" }).select().single();
        if (insertError) console.error(insertError); else settingsData = newSettings;
      }
      setSettings(settingsData);
      if (settingsData?.partner_name) setPartnerName(settingsData.partner_name);
      if (settingsData?.relationship_started_at) {
        const date = new Date(settingsData.relationship_started_at);
        setStartDate(new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
      }
    } catch (error) {
      console.error("Помилка завантаження:", error);
    } finally { setLoading(false); }
  }

  async function loadMoments(coupleId) {
    try {
      const { data, error } = await supabase.from("moments").select("*").eq("couple_id", coupleId).order("moment_date", { ascending: false }).order("created_at", { ascending: false });
      if (error) { console.error("❌ Помилка завантаження моментів:", error); return; }
      setMoments(data || []);
    } catch (error) { console.error("❌ Помилка:", error); }
  }

async function addMoment({ title, description, momentDate, file }) {
    if (!couple?.id || !session?.user?.id) { alert("Не знайдено вашу пару ❤️"); return false; }
    if (!title.trim()) { alert("Введи назву моменту ❤️"); return false; }
    try {
      setMomentLoading(true);
      let imageUrl = null;
      if (file) {
        const extension = file.name.split(".").pop();
        const filePath = `${couple.id}/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage.from("moments").upload(filePath, file, { cacheControl: "3600", upsert: false });
        if (uploadError) { console.error(uploadError); alert("Не вдалося завантажити фото 📸"); return false; }
        const { data: signedData, error: signedError } = await supabase.storage.from("moments").createSignedUrl(filePath, 60 * 60 * 24 * 365);
        if (signedError) { console.error(signedError); alert("Фото завантажено, але не вдалося отримати адресу."); return false; }
        imageUrl = signedData?.signedUrl || null;
      }
      const { data, error } = await supabase.from("moments").insert({ couple_id: couple.id, user_id: session.user.id, title: title.trim(), description: description?.trim() || null, moment_date: momentDate || new Date().toISOString().split("T")[0], image_url: imageUrl }).select().single();
      if (error) { console.error(error); alert("Не вдалося зберегти момент ❤️"); return false; }
      setMoments(prev => [data, ...prev]);
      alert("Момент збережено ❤️");
      return true;
    } catch (error) { console.error(error); alert("Сталася помилка. Спробуй ще раз."); return false; }
    finally { setMomentLoading(false); }
  }
async function deleteMoment(moment) {
  if (!moment?.id) return;

  const confirmed = window.confirm(
    `Видалити момент "${moment.title}"? ❤️`
  );

  if (!confirmed) return;

  try {
    setMomentLoading(true);

    // Видаляємо фото зі Storage, якщо воно є
    if (moment.image_url) {
      try {
        const url = new URL(moment.image_url);
        const marker = "/storage/v1/object/sign/moments/";

        if (url.pathname.includes(marker)) {
          const filePath = decodeURIComponent(
            url.pathname.split(marker)[1].split("?")[0]
          );

          if (filePath) {
            const { error: storageError } =
              await supabase.storage
                .from("moments")
                .remove([filePath]);

            if (storageError) {
              console.error("Помилка видалення фото:", storageError);
            }
          }
        }
      } catch (storageError) {
        console.error("Не вдалося визначити шлях фото:", storageError);
      }
    }

    // Видаляємо сам момент з бази
    const { error } = await supabase
      .from("moments")
      .delete()
      .eq("id", moment.id);

    if (error) {
      console.error(error);
      alert("Не вдалося видалити момент ❤️");
      return;
    }

    setMoments(prev =>
      prev.filter(item => item.id !== moment.id)
    );

    alert("Момент видалено ❤️");
  } catch (error) {
    console.error(error);
    alert("Сталася помилка. Спробуй ще раз.");
  } finally {
    setMomentLoading(false);
  }
               }
  async function updateMoment(e) {
  e.preventDefault();

  if (!editingMoment?.id) return;

  if (!title.trim()) {
    alert("Введи назву моменту ❤️");
    return;
  }

  try {
    setMomentLoading(true);

    let imageUrl = editingMoment.image_url || null;

    // Якщо вибрали нове фото
    if (file) {
      const extension = file.name.split(".").pop();
      const filePath = `${couple.id}/${crypto.randomUUID()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("moments")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false
        });

      if (uploadError) {
        console.error(uploadError);
        alert("Не вдалося завантажити нове фото 📸");
        return;
      }

      const { data: signedData, error: signedError } =
        await supabase.storage
          .from("moments")
          .createSignedUrl(
            filePath,
            60 * 60 * 24 * 365
          );

      if (signedError) {
        console.error(signedError);
        alert("Фото завантажено, але не вдалося отримати адресу.");
        return;
      }

      imageUrl = signedData?.signedUrl || null;
    }

    const { data, error } = await supabase
      .from("moments")
      .update({
        title: title.trim(),
        description: description?.trim() || null,
        moment_date:
          momentDate ||
          new Date().toISOString().split("T")[0],
        image_url: imageUrl
      })
      .eq("id", editingMoment.id)
      .select()
      .single();

    if (error) {
      console.error(error);
      alert("Не вдалося оновити момент ❤️");
      return;
    }

    setMoments(prev =>
      prev.map(item =>
        item.id === editingMoment.id ? data : item
      )
    );

    setEditingMoment(null);
    setTitle("");
    setDescription("");
    setMomentDate(
      new Date().toISOString().split("T")[0]
    );
    setFile(null);
    setShowForm(false);

    alert("Момент оновлено ❤️");
  } catch (error) {
    console.error(error);
    alert("Сталася помилка. Спробуй ще раз.");
  } finally {
    setMomentLoading(false);
  }
  }
  
  async function saveSettings(event) {
    event.preventDefault();
    if (!couple || !startDate) return;
    try {
      setSaving(true);
      const updated = { couple_id: couple.id, relationship_started_at: new Date(startDate).toISOString(), partner_name: partnerName.trim() || "Даша", updated_at: new Date().toISOString() };
      const { error } = await supabase.from("couple_settings").upsert(updated);
      if (error) throw error;
      setSettings(updated);
      setPartnerName(updated.partner_name);
      alert("❤️ Налаштування збережено!");
    } catch (error) { console.error(error); alert("❌ Не вдалося зберегти налаштування."); }
    finally { setSaving(false); }
  }

  async function logout() { await supabase.auth.signOut(); window.location.href = "/login.html"; }

  if (loading) return <div style={styles.loading}><div style={styles.loadingHeart}>❤️</div><div>Завантажуємо наше кохання...</div></div>;
  if (!session) return <div style={styles.loading}><div style={styles.loadingHeart}>🔐</div><h2>Потрібно увійти</h2><button style={styles.primaryButton} onClick={() => window.location.href = "/login.html"}>Увійти ❤️</button></div>;

  const isAdmin = profile?.role === "admin";
  return <div style={styles.app}>
    <header style={styles.header}><div><div style={styles.logo}>My Couple</div><div style={styles.subtitle}>наше маленьке місце ❤️</div></div><button style={styles.settingsButton} onClick={() => setPage("settings")}>⚙️</button></header>
    <main style={styles.content}>
      {page === "home" && <HomePage profile={profile} couple={couple} partnerName={partnerName} loveTime={loveTime} setPage={setPage} />}
      {page === "moments" && <MomentsPage moments={moments} setPage={setPage} addMoment={addMoment} momentLoading={momentLoading} />}
      {page === "calendar" && (
  <CalendarPage
    couple={couple}
    session={session}
    setPage={setPage}
  />
)}
      {page === "dreams" && <DreamsPage />}
      {page === "settings" && <SettingsPage profile={profile} couple={couple} isAdmin={isAdmin} startDate={startDate} setStartDate={setStartDate} partnerName={partnerName} setPartnerName={setPartnerName} saveSettings={saveSettings} saving={saving} logout={logout} />}
    </main>
    <nav style={styles.bottomNav}>{[["home","❤️","Головна"],["moments","📸","Моменти"],["calendar","📅","Календар"],["dreams","✨","Мрії"],["settings","⚙️","Налаштування"]].map(([target,icon,label]) => <button key={target} style={{...styles.navButton,...(page === target ? styles.navActive : {})}} onClick={() => setPage(target)}><span>{icon}</span><small>{label}</small></button>)}</nav>
  </div>;
}

function HomePage({ profile, couple, partnerName, loveTime, setPage }) {
  const userName = profile?.name || "Рома";
  return <div>
    <section style={styles.hero}><div style={styles.heroDecor}>❤️</div><p style={styles.eyebrow}>НАША ІСТОРІЯ</p><h1 style={styles.heroTitle}>Разом — це<br />найкраще ❤️</h1><p style={styles.heroText}>Кожен день поруч —<br />ще одна маленька<br />історія нашого кохання.</p><div style={styles.names}>{userName}<span> ❤️ </span>{partnerName || "Даша"}</div></section>
    <section style={styles.counterCard}><div style={styles.counterTitle}>Ми разом вже</div>{loveTime ? <div style={styles.counterGrid}><CounterItem value={loveTime.years} label="років" /><CounterItem value={loveTime.months} label="місяців" /><CounterItem value={loveTime.days} label="днів" /><CounterItem value={loveTime.hours} label="годин" /><CounterItem value={loveTime.minutes} label="хвилин" /><CounterItem value={loveTime.seconds} label="секунд" /></div> : <div style={styles.noCounter}>❤️</div>}<div style={styles.counterHeart}>❤️</div></section>
    <section><div style={styles.sectionHeader}><div><p style={styles.sectionSmall}>НАШЕ</p><h2 style={styles.sectionTitle}>Все наше ❤️</h2></div></div><div style={styles.cardsGrid}><FeatureCard icon="📸" title="Наші моменти" text="Фото та спогади" onClick={() => setPage("moments")} /><FeatureCard icon="📅" title="Календар" text="Важливі дати" onClick={() => setPage("calendar")} /><FeatureCard icon="✨" title="Наші мрії" text="Те, що здійснимо разом" onClick={() => setPage("dreams")} /><FeatureCard icon="💌" title="Для тебе" text="Маленькі сюрпризи" onClick={() => alert("💌 Скоро тут буде щось особливе!")} /></div></section>
    <section style={styles.quoteCard}><div style={styles.quoteHeart}>💕</div><p style={styles.quote}>"Найкраще місце<br />— поруч із тобою."</p><div style={styles.quoteLine}>─────────</div><p style={styles.quoteBottom}>Наша історія тільки починається ❤️</p></section>
    {couple?.invite_code && <section style={styles.codeCard}><div style={styles.codeIcon}>🔐</div><div><div style={styles.codeLabel}>КОД НАШОЇ ПАРИ</div><div style={styles.codeValue}>{couple.invite_code}</div></div></section>}
  </div>;
}

function MomentsPage({ moments, setPage, addMoment, momentLoading }) {
  const [showForm,setShowForm]=useState(false); const [editingMoment, setEditingMoment] = useState(null); const [title,setTitle]=useState(""); const [description,setDescription]=useState(""); const [momentDate,setMomentDate]=useState(new Date().toISOString().split("T")[0]); const [file,setFile]=useState(null);
  async function handleSubmit(e){e.preventDefault();const ok=await addMoment({title,description,momentDate,file});if(ok){setTitle("");setDescription("");setMomentDate(new Date().toISOString().split("T")[0]);setFile(null);setShowForm(false);}}
  return <div>
    <section style={styles.pageHeader}><button style={styles.backButton} onClick={()=>setPage("home")}>←</button><div><p style={styles.sectionSmall}>НАША ІСТОРІЯ</p><h1 style={styles.pageTitle}>Наші моменти 📸</h1></div></section>
    <section style={styles.momentsTopCard}><div style={styles.momentsTopIcon}>❤️</div><div style={{flex:1}}><div style={styles.momentsTopTitle}>Зберігаймо наші спогади</div><div style={styles.momentsTopText}>Додавайте фотографії та особливі моменти, щоб ваша історія завжди залишалася з вами.</div></div></section>
    <button style={styles.addMomentButton} onClick={()=>setShowForm(!showForm)}>{showForm ? "✕ Скасувати" : "＋ Додати момент ❤️"}</button>
    {showForm && <form style={styles.momentForm} onSubmit={handleSubmit}><div style={styles.formTitle}>Новий момент 💕</div><label style={styles.formLabel}>📸 Фотографія</label><input type="file" accept="image/*" onChange={e=>setFile(e.target.files?.[0]||null)} style={styles.fileInput}/>{file&&<div style={styles.selectedFile}>📷 {file.name}</div>}<label style={styles.formLabel}>❤️ Назва</label><input type="text" value={title} onChange={e=>setTitle(e.target.value)} placeholder="Наприклад: Наша перша поїздка" style={styles.formInput} required/><label style={styles.formLabel}>📝 Опис</label><textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="Розкажи трохи про цей момент..." style={styles.formTextarea} rows={4}/><label style={styles.formLabel}>📅 Дата</label><input type="date" value={momentDate} onChange={e=>setMomentDate(e.target.value)} style={styles.formInput}/><button type="submit" style={styles.saveMomentButton} disabled={momentLoading}>{momentLoading?"Зберігаю... ❤️":"💾 Зберегти момент"}</button></form>}
    {moments.length===0?<div style={styles.emptyMoments}><div style={styles.emptyMomentsIcon}>📸</div><div style={styles.emptyMomentsTitle}>Тут поки порожньо</div><div style={styles.emptyMomentsText}>Додайте ваш перший спільний спогад ❤️</div></div>:<div style={styles.momentsList}>{moments.map(m=><article key={m.id} style={styles.momentCard}>{m.image_url&&<img src={m.image_url} alt={m.title} style={styles.momentImage}/>}<div style={styles.momentContent}><div style={styles.momentDate}>📅 {m.moment_date}</div><h3 style={styles.momentTitle}>{m.title}</h3> 
    id="q7m4xp"
<div style={styles.momentActions}>
  <button
    type="button"
    onClick={() => {
      setEditingMoment(m);
      setTitle(m.title || "");
      setDescription(m.description || "");
      setMomentDate(m.moment_date || "");
      setFile(null);
      setShowForm(true);
    }}
    style={styles.editMomentButton}
  >
    ✏️ Редагувати
  </button>

  <button
    type="button"
    onClick={() => deleteMoment(m)}
    style={styles.deleteMomentButton}
  >
    🗑️ Видалити
  </button>
</div>
      {m.description&&<p style={styles.momentDescription}>{m.description}</p>}</div></article>)}</div>}
  </div>;
}

function CounterItem({value,label}){return <div style={styles.counterItem}><div style={styles.counterNumber}>{pad(value)}</div><div style={styles.counterLabel}>{label}</div></div>}
function FeatureCard({icon,title,text,onClick}){return <button style={styles.featureCard} onClick={onClick}><div style={styles.featureIcon}>{icon}</div><div style={styles.featureTitle}>{title}</div><div style={styles.featureText}>{text}</div><div style={styles.featureArrow}>→</div></button>}
function CalendarPage({ couple, session, setPage }) {
  const [events, setEvents] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [description, setDescription] = useState("");
  const [eventType, setEventType] = useState("other");
const [editingEvent, setEditingEvent] = useState(null);
  const [calendarMonth, setCalendarMonth] = useState(
  new Date(new Date().getFullYear(), new Date().getMonth(), 1)
);

const [selectedCalendarDate, setSelectedCalendarDate] = useState(null);
  useEffect(() => {
    if (couple?.id) loadEvents();
  }, [couple?.id]);

  async function loadEvents() {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("calendar_events")
        .select("*")
        .eq("couple_id", couple.id)
        .order("event_date", { ascending: true });

      if (error) {
        console.error("Помилка завантаження календаря:", error);
        alert("Не вдалося завантажити календар ❤️");
        return;
      }

      setEvents(data || []);
    } finally {
      setLoading(false);
    }
  }

  function startEditEvent(event) {
  setEditingEvent(event);
  setTitle(event.title || "");
  setEventDate(event.event_date || "");
  setDescription(event.description || "");
  setEventType(event.event_type || "other");
  setShowForm(true);
  }
  async function addEvent(e) {
    e.preventDefault();

    if (!title.trim()) {
      alert("Введи назву події ❤️");
      return;
    }

    if (!eventDate) {
      alert("Обери дату 📅");
      return;
    }

    if (!couple?.id || !session?.user?.id) {
      alert("Не знайдено вашу пару ❤️");
      return;
    }

    try {
      setSaving(true);

      const { data, error } = await supabase
        .from("calendar_events")
        .insert({
          couple_id: couple.id,
          user_id: session.user.id,
          title: title.trim(),
          event_date: eventDate,
          description: description.trim() || null,
          event_type: eventType
        })
        .select()
        .single();

      if (error) {
        console.error("Помилка створення події:", error);
        alert("Не вдалося зберегти подію ❤️");
        return;
      }

      setEvents(prev =>
        [...prev, data].sort(
          (a, b) =>
            new Date(a.event_date) - new Date(b.event_date)
        )
      );

      setTitle("");
      setEventDate("");
      setDescription("");
      setEventType("other");
      setShowForm(false);

      alert("❤️ Подію додано!");
    } finally {
      setSaving(false);
    }
  }
    
  async function updateEvent(e) {
    e.preventDefault();

    if (!editingEvent) return;

    if (!title.trim()) {
      alert("Введи назву події ❤️");
      return;
    }

    if (!eventDate) {
      alert("Обери дату 📅");
      return;
    }

    try {
      setSaving(true);

      const { data, error } = await supabase
        .from("calendar_events")
        .update({
          title: title.trim(),
          event_date: eventDate,
          description: description.trim() || null,
          event_type: eventType
        })
        .eq("id", editingEvent.id)
        .select()
        .single();

      if (error) {
        console.error("Помилка редагування події:", error);
        alert("Не вдалося змінити подію ❤️");
        return;
      }

      setEvents(prev =>
        prev
          .map(event =>
            event.id === data.id ? data : event
          )
          .sort(
            (a, b) =>
              new Date(a.event_date) -
              new Date(b.event_date)
          )
      );

      setEditingEvent(null);
      setTitle("");
      setEventDate("");
      setDescription("");
      setEventType("other");
      setShowForm(false);

      alert("❤️ Подію змінено!");
    } finally {
      setSaving(false);
    }
  }
async function deleteEvent(event) {
  const confirmed = window.confirm(
    `Видалити подію "${event.title}"?`
  );

  if (!confirmed) return;

  const { error } = await supabase
    .from("calendar_events")
    .delete()
    .eq("id", event.id);

  if (error) {
    console.error("Помилка видалення події:", error);
    alert("Не вдалося видалити подію ❤️");
    return;
  }

  setEvents(prev =>
    prev.filter(item => item.id !== event.id)
  );

  alert("🗑️ Подію видалено!");
}
  function getNextOccurrence(date) {
  const original = new Date(date + "T00:00:00");
  const today = new Date();

  let nextDate = new Date(
    today.getFullYear(),
    original.getMonth(),
    original.getDate()
  );

  if (nextDate < new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  )) {
    nextDate = new Date(
      today.getFullYear() + 1,
      original.getMonth(),
      original.getDate()
    );
  }

  return nextDate;
}

function getDaysUntil(date, eventType) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (
    eventType === "anniversary" ||
    eventType === "birthday"
  ) {
    const nextDate = getNextOccurrence(date);

    return Math.ceil(
      (nextDate - today) /
      (1000 * 60 * 60 * 24)
    );
  }

  const target = new Date(date + "T00:00:00");
  target.setHours(0, 0, 0, 0);

  return Math.ceil(
    (target - today) /
    (1000 * 60 * 60 * 24)
  );
}

  function getEventIcon(type) {
    const icons = {
      anniversary: "❤️",
      birthday: "🎂",
      date: "🌹",
      holiday: "🎉",
      other: "📅"
    };

    return icons[type] || "📅";
  }

  function getEventName(type) {
    const names = {
      anniversary: "Річниця",
      birthday: "День народження",
      date: "Побачення",
      holiday: "Свято",
      other: "Інше"
    };

    return names[type] || "Інше";
  }
function getCalendarDays() {
  const year = calendarMonth.getFullYear();
  const month = calendarMonth.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Понеділок = 0, неділя = 6
  const startDay = (firstDay.getDay() + 6) % 7;
  const totalDays = lastDay.getDate();

  const days = [];

  // Порожні клітинки перед 1 числом
  for (let i = 0; i < startDay; i++) {
    days.push(null);
  }

  // Дні місяця
  for (let day = 1; day <= totalDays; day++) {
    days.push(
      new Date(year, month, day)
    );
  }

  return days;
}

function formatCalendarMonth() {
  return calendarMonth.toLocaleDateString("uk-UA", {
    month: "long",
    year: "numeric"
  });
}

function changeCalendarMonth(offset) {
  setCalendarMonth(
    new Date(
      calendarMonth.getFullYear(),
      calendarMonth.getMonth() + offset,
      1
    )
  );

  setSelectedCalendarDate(null);
}

function getEventsForCalendarDay(day) {
  if (!day) return [];

  const year = day.getFullYear();
  const month = String(day.getMonth() + 1).padStart(2, "0");
  const date = String(day.getDate()).padStart(2, "0");

  const dateString = `${year}-${month}-${date}`;

  return events.filter(event => {
    if (event.event_date === dateString) {
      return true;
    }

    if (
      event.event_type === "anniversary" ||
      event.event_type === "birthday"
    ) {
      const original = new Date(
        event.event_date + "T00:00:00"
      );

      return (
        original.getMonth() === day.getMonth() &&
        original.getDate() === day.getDate()
      );
    }

    return false;
  });
    }
  
  const upcomingEvents = events
  .map(event => ({
    ...event,
    daysUntil: getDaysUntil(
      event.event_date,
      event.event_type
    )
  }))
    .filter(event => event.daysUntil >= 0)
    .sort((a, b) => a.daysUntil - b.daysUntil);
const todayEvent = upcomingEvents.find(
  event => event.daysUntil === 0
);

const tomorrowEvent = upcomingEvents.find(
  event => event.daysUntil === 1
);
  
  const nextEvent = upcomingEvents[0];

  return (
    <div>
      <section style={styles.pageHeader}>
        <button
          style={styles.backButton}
          onClick={() => setPage("home")}
        >
          ←
        </button>

        <div>
          <p style={styles.sectionSmall}>НАША ІСТОРІЯ</p>
          <h1 style={styles.pageTitle}>Наш календар 📅</h1>
        </div>
      </section>

      <section style={styles.monthCalendarCard}>
  <div style={styles.monthCalendarHeader}>
    <button
      type="button"
      onClick={() => changeCalendarMonth(-1)}
      style={styles.monthCalendarArrow}
    >
      ‹
    </button>

   <div style={styles.monthCalendarTitleWrap}>
  <div style={styles.monthCalendarTitle}>
    {formatCalendarMonth()}
  </div>

  <button
    type="button"
    onClick={() => {
      const today = new Date();

      setCalendarMonth(
        new Date(
          today.getFullYear(),
          today.getMonth(),
          1
        )
      );

      setSelectedCalendarDate(null);
    }}
    style={styles.todayCalendarButton}
  >
    Сьогодні
  </button>
</div>

    <button
      type="button"
      onClick={() => changeCalendarMonth(1)}
      style={styles.monthCalendarArrow}
    >
      ›
    </button>
  </div>

  <div style={styles.calendarWeekDays}>
    {[
      "Пн",
      "Вт",
      "Ср",
      "Чт",
      "Пт",
      "Сб",
      "Нд"
    ].map(day => (
      <div
        key={day}
        style={styles.calendarWeekDay}
      >
        {day}
      </div>
    ))}
  </div>

  <div style={styles.calendarGrid}>
    {getCalendarDays().map((day, index) => {
      if (!day) {
        return (
          <div
            key={`empty-${index}`}
            style={styles.calendarEmptyDay}
          />
        );
      }

      const dayEvents = getEventsForCalendarDay(day);

      const today = new Date();

      const isToday =
        day.getFullYear() === today.getFullYear() &&
        day.getMonth() === today.getMonth() &&
        day.getDate() === today.getDate();

      const dateKey =
        `${day.getFullYear()}-` +
        `${String(day.getMonth() + 1).padStart(2, "0")}-` +
        `${String(day.getDate()).padStart(2, "0")}`;

      const isSelected =
        selectedCalendarDate === dateKey;

      return (
        <button
          key={dateKey}
          type="button"
          onClick={() => {
  setSelectedCalendarDate(dateKey);
}}
          style={{
            ...styles.calendarDay,
            ...(isToday
              ? styles.calendarToday
              : {}),
            ...(isSelected
              ? styles.calendarSelectedDay
              : {})
          }}
        >
          <span>
            {day.getDate()}
          </span>

          {dayEvents.length > 0 && (
            <div style={styles.calendarEventDots}>
              {dayEvents.slice(0, 3).map(event => (
                <span
                  key={event.id}
                  style={styles.calendarEventDot}
                >
                  {getEventIcon(event.event_type)}
                </span>
              ))}
            </div>
          )}
        </button>
      );
    })}
  </div>
</section>
      {selectedCalendarDate && (
  <section style={styles.selectedDayCard}>
    <div style={styles.selectedDayHeader}>
      <div>
        <div style={styles.selectedDayLabel}>
          ОБРАНА ДАТА
        </div>

        <div style={styles.selectedDayTitle}>
          📅 {selectedCalendarDate}
        </div>
      </div>

      <button
        type="button"
        onClick={() => {
          setEventDate(selectedCalendarDate);
          setEditingEvent(null);
          setTitle("");
          setDescription("");
          setEventType("other");
          setShowForm(true);
        }}
        style={styles.selectedDayAddButton}
      >
        ＋
      </button>
    </div>

    {getEventsForCalendarDay(
      new Date(selectedCalendarDate + "T00:00:00")
    ).length === 0 ? (
      <div style={styles.noSelectedDayEvents}>
        На цей день подій немає ❤️
      </div>
    ) : (
      getEventsForCalendarDay(
        new Date(selectedCalendarDate + "T00:00:00")
      ).map(event => (
        <div
          key={event.id}
          style={styles.selectedDayEvent}
        >
          <div style={styles.selectedDayEventIcon}>
            {getEventIcon(event.event_type)}
          </div>

          <div style={{ flex: 1 }}>
            <div style={styles.selectedDayEventTitle}>
              {event.title}
            </div>

            {event.description && (
              <div style={styles.selectedDayEventDescription}>
                {event.description}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => startEditEvent(event)}
            style={styles.editEventButton}
          >
            ✏️
          </button>

          <button
            type="button"
            onClick={() => deleteEvent(event)}
            style={styles.deleteEventButton}
          >
            🗑️
          </button>
        </div>
      ))
    )}
  </section>
)}
      
      {nextEvent && (
        <section style={styles.calendarNextCard}>
          <div style={styles.calendarNextIcon}>
            {getEventIcon(nextEvent.event_type)}
          </div>

          <div style={{ flex: 1 }}>
            <div style={styles.calendarNextLabel}>
              НАЙБЛИЖЧА ПОДІЯ
            </div>

            <div style={styles.calendarNextTitle}>
              {nextEvent.title}
            </div>

            <div style={styles.calendarNextDate}>
              📅 {nextEvent.event_date}
            </div>
          </div>

          <div style={styles.calendarCountdown}>
            {nextEvent.daysUntil === 0
              ? "Сьогодні ❤️"
              : `${nextEvent.daysUntil} дн.`}
          </div>
        </section>
      )}

      <button
        style={styles.addMomentButton}
        onClick={() => setShowForm(!showForm)}
      >
        {showForm
          ? "✕ Скасувати"
          : "＋ Додати важливу дату ❤️"}
      </button>

      {showForm && (
        <form
          style={styles.momentForm}
          onSubmit={editingEvent ? updateEvent : addEvent}
        >
          <div style={styles.formTitle}>
  {editingEvent ? "Редагувати дату ✏️" : "Нова важлива дата 💕"}
</div>

          <label style={styles.formLabel}>
            📅 Назва події
          </label>

          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Наприклад: Наша річниця"
            style={styles.formInput}
            required
          />

          <label style={styles.formLabel}>
            🗓️ Дата
          </label>

          <input
            type="date"
            value={eventDate}
            onChange={e => setEventDate(e.target.value)}
            style={styles.formInput}
            required
          />

          <label style={styles.formLabel}>
            🎂 Тип події
          </label>

          <select
            value={eventType}
            onChange={e => setEventType(e.target.value)}
            style={styles.formInput}
          >
            <option value="anniversary">❤️ Річниця</option>
            <option value="birthday">🎂 День народження</option>
            <option value="date">🌹 Побачення</option>
            <option value="holiday">🎉 Свято</option>
            <option value="other">📅 Інше</option>
          </select>

          <label style={styles.formLabel}>
            📝 Опис
          </label>

          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Наприклад: Хочемо поїхати разом..."
            style={styles.formTextarea}
            rows={4}
          />

          <button
            type="submit"
            style={styles.saveMomentButton}
            disabled={saving}
          >
            {saving
              ? "Зберігаю... ❤️"
            : editingEvent
  ? "💾 Зберегти зміни"
  : "💾 Зберегти дату"}
          </button>
        </form>
      )}
{todayEvent && (
  <div style={styles.specialDayCard}>
    <div style={styles.specialDayIcon}>❤️</div>

    <div>
      <div style={styles.specialDayTitle}>
        Сьогодні особливий день!
      </div>

      <div style={styles.specialDayText}>
        {todayEvent.title} 🥰
      </div>

      {todayEvent.description && (
        <div style={styles.specialDayDescription}>
          {todayEvent.description}
        </div>
      )}
    </div>
  </div>
)}

{!todayEvent && tomorrowEvent && (
  <div style={styles.specialDayCard}>
    <div style={styles.specialDayIcon}>⏰</div>

    <div>
      <div style={styles.specialDayTitle}>
        Вже завтра!
      </div>

      <div style={styles.specialDayText}>
        {tomorrowEvent.title} ❤️
      </div>
    </div>
  </div>
)}

  
      {events.map(event => (
            <article
              key={event.id}
              style={styles.calendarEventCard}
            >
              
              <div style={styles.calendarEventIcon}>
                {getEventIcon(event.event_type)}
              </div>

              <div style={{ flex: 1 }}>
                <div style={styles.calendarEventType}>
                  {getEventName(event.event_type)}
                </div>

                <h3 style={styles.momentTitle}>
                  {event.title}
                </h3>

                <div style={styles.momentDate}>
                  📅 {event.event_date}
                </div>

                {event.description && (
                  <p style={styles.momentDescription}>
                    {event.description}
                  </p>
                )}
              </div>

              {getDaysUntil(
  event.event_date,
  event.event_type
) >= 0 && (
                <div style={styles.eventDays}>
                  {getDaysUntil(
  event.event_date,
  event.event_type
) === 0
                    ? "❤️"
                    : `${getDaysUntil(
  event.event_date,
  event.event_type
)} дн.`}
                </div>
                            )}
                            <button
                type="button"
                onClick={() => startEditEvent(event)}
                style={styles.editEventButton}
              >
                ✏️
              </button>
              <button
  type="button"
onClick={() => deleteEvent(event)}
style={styles.deleteEventButton}
>
  🗑️
</button>
              
            </article>
                                        ))}
      
    </div>
  );
}
function DreamsPage(){return <PageWrapper icon="✨" title="Наші мрії" subtitle="Те, що ми хочемо здійснити"><EmptyState icon="🌙" title="Мрії попереду" text="Тут буде наш спільний список мрій та цілей."/></PageWrapper>}
function PageWrapper({icon,title,subtitle,children}){return <div><section style={styles.pageHeaderCenter}><div style={styles.pageIcon}>{icon}</div><h1 style={styles.pageTitle}>{title}</h1><p style={styles.pageSubtitle}>{subtitle}</p></section>{children}</div>}function EmptyState({icon,title,text}){return <div style={styles.emptyState}><div style={styles.emptyIcon}>{icon}</div><h3 style={styles.emptyTitle}>{title}</h3><p style={styles.emptyText}>{text}</p></div>}
function SettingsPage({profile,couple,isAdmin,startDate,setStartDate,partnerName,setPartnerName,saveSettings,saving,logout}){return <div><section style={styles.pageHeaderCenter}><div style={styles.pageIcon}>⚙️</div><h1 style={styles.pageTitle}>Налаштування</h1><p style={styles.pageSubtitle}>Налаштування нашої пари</p></section>{isAdmin?<section style={styles.settingsCard}><div style={styles.settingsTop}><div style={styles.settingsIcon}>👑</div><div><h2 style={styles.settingsTitle}>Налаштування адміністратора</h2><p style={styles.settingsText}>Тільки адміністратор може змінювати ці налаштування.</p></div></div><form onSubmit={saveSettings} style={styles.form}><label style={styles.label}>❤️ Початок наших стосунків</label><input type="datetime-local" value={startDate} onChange={e=>setStartDate(e.target.value)} style={styles.input} required/><label style={styles.label}>👩 Ім'я коханої</label><input type="text" value={partnerName} onChange={e=>setPartnerName(e.target.value)} placeholder="Наприклад: Даша" style={styles.input} maxLength={40} required/><button type="submit" style={styles.primaryButton} disabled={saving}>{saving?"Зберігаємо...":"Зберегти ❤️"}</button></form></section>:<section style={styles.infoCard}><div style={styles.bigEmoji}>🔒</div><h3 style={styles.infoTitle}>Налаштування доступні адміну</h3><p style={styles.infoText}>Дату початку стосунків та інші важливі параметри може змінювати тільки адміністратор.</p></section>}<section style={styles.accountCard}><div style={styles.accountTitle}>👤 Мій профіль</div><div style={styles.accountRow}><span>Ім'я</span><strong>{profile?.name||"Користувач"}</strong></div><div style={styles.accountRow}><span>Роль</span><strong>{isAdmin?"👑 Адміністратор":"❤️ Учасник пари"}</strong></div><div style={styles.accountRow}><span>Кохана</span><strong>{partnerName||"Даша"}</strong></div>{couple?.invite_code&&<div style={styles.accountRow}><span>Код пари</span><strong>{couple.invite_code}</strong></div>}</section><button style={styles.logoutButton} onClick={logout}>Вийти з акаунта</button></div>}

const styles={
app:{minHeight:"100vh",background:"linear-gradient(180deg,#fff7fa 0%,#fff 55%,#fff8fb 100%)",color:"#3b2630",fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",paddingBottom:"90px"},
loading:{minHeight:"100vh",display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center",gap:"14px",background:"#fff7fa",color:"#5b3542",fontSize:"17px",padding:"20px",textAlign:"center"},loadingHeart:{fontSize:"52px"},
header:{position:"sticky",top:0,zIndex:20,display:"flex",justifyContent:"space-between",alignItems:"center",padding:"18px 18px 14px",background:"rgba(255,255,255,.92)",backdropFilter:"blur(12px)",borderBottom:"1px solid rgba(210,150,170,.15)"},logo:{fontSize:"24px",fontWeight:"800",letterSpacing:"-.7px",color:"#5b3040"},subtitle:{fontSize:"12px",marginTop:"2px",color:"#a77b88"},settingsButton:{width:"44px",height:"44px",border:"none",borderRadius:"50%",background:"#fff0f4",fontSize:"20px",cursor:"pointer",boxShadow:"0 5px 18px rgba(130,70,90,.10)"},
content:{width:"100%",maxWidth:"760px",margin:"0 auto",padding:"18px 16px 25px",boxSizing:"border-box"},hero:{position:"relative",overflow:"hidden",borderRadius:"30px",padding:"30px 24px",marginBottom:"18px",background:"linear-gradient(135deg,#ffe7ee,#fff1f5 55%,#fff)",boxShadow:"0 14px 40px rgba(150,75,100,.10)"},heroDecor:{position:"absolute",right:"-5px",top:"-15px",fontSize:"105px",opacity:".14",transform:"rotate(12deg)"},eyebrow:{position:"relative",margin:0,color:"#b56b82",fontSize:"11px",fontWeight:"800",letterSpacing:"2px"},heroTitle:{position:"relative",margin:"10px 0",fontSize:"34px",lineHeight:"1.08",letterSpacing:"-1.2px",color:"#542d3a"},heroText:{position:"relative",maxWidth:"470px",margin:"0 0 18px",lineHeight:"1.55",fontSize:"14px",color:"#8d6672"},names:{position:"relative",display:"inline-block",padding:"9px 14px",borderRadius:"100px",background:"rgba(255,255,255,.72)",color:"#754253",fontWeight:"700",fontSize:"14px"},
counterCard:{position:"relative",overflow:"hidden",padding:"22px 14px 20px",marginBottom:"28px",borderRadius:"28px",background:"#fff",border:"1px solid #f4dfe6",boxShadow:"0 12px 35px rgba(140,70,90,.08)",textAlign:"center"},counterTitle:{color:"#9b7180",fontSize:"13px",fontWeight:"700",marginBottom:"16px"},counterGrid:{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"10px"},counterItem:{padding:"9px 3px"},counterNumber:{fontSize:"25px",fontWeight:"800",color:"#653545",lineHeight:"1.1"},counterLabel:{marginTop:"4px",fontSize:"10px",color:"#ad8995",fontWeight:"600"},counterHeart:{position:"absolute",right:"13px",bottom:"9px",fontSize:"18px",opacity:".6"},noCounter:{fontSize:"40px",padding:"20px"},
sectionHeader:{display:"flex",justifyContent:"space-between",alignItems:"end",marginBottom:"14px"},sectionSmall:{margin:0,fontSize:"10px",letterSpacing:"2px",fontWeight:"800",color:"#bb8193"},sectionTitle:{margin:"3px 0 0",fontSize:"25px",color:"#56313e",letterSpacing:"-.6px"},cardsGrid:{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:"12px"},featureCard:{position:"relative",textAlign:"left",border:"1px solid #f3e0e6",borderRadius:"23px",background:"#fff",padding:"18px 16px 20px",minHeight:"145px",cursor:"pointer",boxShadow:"0 8px 25px rgba(140,70,90,.06)"},featureIcon:{width:"44px",height:"44px",display:"flex",alignItems:"center",justifyContent:"center",borderRadius:"15px",background:"#fff0f4",fontSize:"23px",marginBottom:"14px"},featureTitle:{fontWeight:"800",color:"#5c3542",fontSize:"15px"},featureText:{marginTop:"4px",color:"#a17d89",fontSize:"11px",lineHeight:"1.4"},featureArrow:{position:"absolute",right:"14px",bottom:"13px",color:"#d18aa0",fontSize:"18px"},
quoteCard:{marginTop:"18px",padding:"28px 20px",textAlign:"center",borderRadius:"27px",background:"linear-gradient(135deg,#fff0f4,#fff8fa)",border:"1px solid #f5dfe7"},quoteHeart:{fontSize:"27px",marginBottom:"7px"},quote:{margin:0,fontSize:"19px",lineHeight:"1.45",fontWeight:"700",color:"#693847"},quoteLine:{margin:"12px 0",color:"#e2a7b8",fontSize:"10px"},quoteBottom:{margin:0,fontSize:"11px",color:"#a67c89"},codeCard:{display:"flex",alignItems:"center",gap:"13px",marginTop:"14px",padding:"16px",borderRadius:"20px",background:"#fff",border:"1px solid #f2e0e6"},codeIcon:{width:"42px",height:"42px",borderRadius:"13px",display:"flex",alignItems:"center",justifyContent:"center",background:"#f8f0ff",fontSize:"20px"},codeLabel:{fontSize:"9px",color:"#a48691",fontWeight:"800",letterSpacing:"1.2px"},codeValue:{marginTop:"3px",fontSize:"18px",fontWeight:"800",letterSpacing:"2px",color:"#623746"},
pageHeader:{display:"flex",alignItems:"center",gap:"16px",marginBottom:"24px"},pageHeaderCenter:{textAlign:"center",padding:"15px 5px 25px"},pageIcon:{fontSize:"39px",marginBottom:"8px"},pageTitle:{margin:0,fontSize:"29px",color:"#58323f",letterSpacing:"-.7px"},pageSubtitle:{margin:"6px 0 0",color:"#a27b88",fontSize:"13px"},backButton:{width:"46px",height:"46px",border:"none",borderRadius:"50%",background:"#fff",fontSize:"24px",cursor:"pointer",boxShadow:"0 4px 15px rgba(0,0,0,0.08)"},
emptyState:{textAlign:"center",padding:"45px 25px",borderRadius:"27px",background:"#fff",border:"1px solid #f2e0e6",boxShadow:"0 10px 30px rgba(140,70,90,.05)"},emptyIcon:{fontSize:"52px",marginBottom:"12px"},emptyTitle:{margin:0,fontSize:"19px",color:"#633847"},emptyText:{maxWidth:"430px",margin:"8px auto 0",color:"#a07c88",lineHeight:"1.55",fontSize:"13px"},infoCard:{padding:"30px 22px",textAlign:"center",borderRadius:"27px",background:"#fff",border:"1px solid #f2e0e6",boxShadow:"0 10px 30px rgba(140,70,90,.05)"},bigEmoji:{fontSize:"45px",marginBottom:"10px"},infoTitle:{margin:0,color:"#613645",fontSize:"19px"},infoText:{margin:"9px auto 0",maxWidth:"500px",color:"#9d7985",lineHeight:"1.55",fontSize:"13px"},
settingsCard:{padding:"21px",borderRadius:"25px",background:"#fff",border:"1px solid #f0dce4",boxShadow:"0 10px 30px rgba(140,70,90,.06)"},settingsTop:{display:"flex",gap:"13px",alignItems:"flex-start",marginBottom:"22px"},settingsIcon:{flexShrink:0,width:"47px",height:"47px",borderRadius:"15px",display:"flex",alignItems:"center",justifyContent:"center",background:"#fff0cf",fontSize:"23px"},settingsTitle:{margin:0,color:"#5d3542",fontSize:"17px"},settingsText:{margin:"5px 0 0",color:"#a17c89",fontSize:"12px",lineHeight:"1.45"},form:{display:"flex",flexDirection:"column",gap:"9px"},label:{color:"#704150",fontSize:"13px",fontWeight:"700"},input:{width:"100%",boxSizing:"border-box",padding:"13px 14px",borderRadius:"14px",border:"1px solid #ead5dd",background:"#fffafb",color:"#593440",fontSize:"14px",outline:"none"},primaryButton:{marginTop:"5px",width:"100%",border:"none",borderRadius:"15px",padding:"14px 18px",background:"linear-gradient(135deg,#d96f8f,#bd5878)",color:"#fff",fontSize:"14px",fontWeight:"800",cursor:"pointer",boxShadow:"0 8px 20px rgba(190,80,115,.22)"},accountCard:{marginTop:"14px",padding:"19px",borderRadius:"23px",background:"#fff",border:"1px solid #f1dfe5"},accountTitle:{marginBottom:"13px",color:"#613645",fontSize:"16px",fontWeight:"800"},accountRow:{display:"flex",justifyContent:"space-between",gap:"12px",padding:"10px 0",borderTop:"1px solid #f7e9ed",fontSize:"13px",color:"#a07d88"},logoutButton:{width:"100%",marginTop:"15px",padding:"13px",borderRadius:"15px",border:"1px solid #f0cbd5",background:"#fff",color:"#b74f6d",fontWeight:"700",cursor:"pointer"},
bottomNav:{position:"fixed",zIndex:30,bottom:0,left:0,right:0,height:"70px",display:"flex",justifyContent:"center",gap:"2px",padding:"5px",boxSizing:"border-box",background:"rgba(255,255,255,.96)",backdropFilter:"blur(14px)",borderTop:"1px solid rgba(210,150,170,.18)",boxShadow:"0 -5px 25px rgba(100,50,70,.07)"},navButton:{flex:1,maxWidth:"100px",border:"none",background:"transparent",borderRadius:"14px",color:"#a88a94",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"3px"},navActive:{background:"#fff0f4",color:"#b85876"},
momentsTopCard:{display:"flex",gap:"16px",alignItems:"center",padding:"20px",marginBottom:"18px",background:"#fff5f7",borderRadius:"22px"},momentsTopIcon:{width:"52px",height:"52px",display:"flex",alignItems:"center",justifyContent:"center",background:"#fff",borderRadius:"50%",fontSize:"25px",flexShrink:0},momentsTopTitle:{fontSize:"18px",fontWeight:"700",color:"#3b2630",marginBottom:"6px"},momentsTopText:{fontSize:"14px",lineHeight:"1.5",color:"#806c73"},addMomentButton:{width:"100%",padding:"16px",border:"none",borderRadius:"18px",background:"#e96b83",color:"#fff",fontSize:"16px",fontWeight:"700",cursor:"pointer",marginBottom:"18px"},momentForm:{background:"#fff",padding:"20px",borderRadius:"22px",marginBottom:"22px",boxShadow:"0 5px 20px rgba(0,0,0,0.06)"},formTitle:{fontSize:"21px",fontWeight:"700",color:"#3b2630",marginBottom:"20px"},formLabel:{display:"block",fontSize:"14px",fontWeight:"600",color:"#5c464e",marginTop:"14px",marginBottom:"7px"},formInput:{width:"100%",boxSizing:"border-box",padding:"13px 14px",border:"1px solid #eadde1",borderRadius:"13px",background:"#fff",fontSize:"15px"},formTextarea:{width:"100%",boxSizing:"border-box",padding:"13px 14px",border:"1px solid #eadde1",borderRadius:"13px",background:"#fff",fontSize:"15px",resize:"vertical",fontFamily:"inherit"},fileInput:{width:"100%",boxSizing:"border-box",padding:"12px",border:"1px dashed #e2cbd2",borderRadius:"13px",background:"#fff8fa"},selectedFile:{marginTop:"8px",padding:"10px",borderRadius:"10px",background:"#f8f1f3",fontSize:"13px",color:"#705a62"},saveMomentButton:{width:"100%",padding:"15px",marginTop:"20px",border:"none",borderRadius:"15px",background:"#3b2630",color:"#fff",fontSize:"15px",fontWeight:"700",cursor:"pointer"},emptyMoments:{textAlign:"center",padding:"55px 20px",background:"#fff",borderRadius:"22px",marginTop:"10px"},emptyMomentsIcon:{fontSize:"48px",marginBottom:"12px"},emptyMomentsTitle:{fontSize:"19px",fontWeight:"700",color:"#3b2630",marginBottom:"7px"},emptyMomentsText:{fontSize:"14px",color:"#806c73"},momentsList:{display:"flex",flexDirection:"column",gap:"18px"},momentCard:{background:"#fff",borderRadius:"22px",overflow:"hidden",boxShadow:"0 5px 20px rgba(0,0,0,0.06)"},momentImage:{width:"100%",display:"block",maxHeight:"420px",objectFit:"cover"},momentContent:{padding:"18px"},momentDate:{fontSize:"12px",color:"#a08089",marginBottom:"7px"},momentTitle:{margin:"0 0 8px",fontSize:"20px",color:"#3b2630"},momentDescription:{margin:0,fontSize:"14px",lineHeight:"1.6",color:"#806c73"},

  selectedDayCard:{
  padding:"16px",
  marginBottom:"18px",
  background:"#fff8fa",
  borderRadius:"20px",
  border:"1px solid #f2dce4",
  boxShadow:"0 6px 20px rgba(140,70,90,.05)"
},

selectedDayHeader:{
  display:"flex",
  alignItems:"center",
  justifyContent:"space-between",
  gap:"12px",
  marginBottom:"12px"
},

selectedDayLabel:{
  fontSize:"9px",
  fontWeight:"800",
  letterSpacing:"1px",
  color:"#b47789",
  marginBottom:"4px"
},

selectedDayTitle:{
  fontSize:"16px",
  fontWeight:"800",
  color:"#5c3542"
},

selectedDayAddButton:{
  width:"40px",
  height:"40px",
  border:"none",
  borderRadius:"13px",
  background:"#bd5878",
  color:"#fff",
  fontSize:"23px",
  cursor:"pointer"
},

noSelectedDayEvents:{
  padding:"13px",
  borderRadius:"13px",
  background:"#fff",
  color:"#a27d89",
  fontSize:"12px",
  textAlign:"center"
},

selectedDayEvent:{
  display:"flex",
  alignItems:"center",
  gap:"10px",
  padding:"11px",
  marginTop:"8px",
  background:"#fff",
  borderRadius:"14px",
  border:"1px solid #f3e4e9"
},

selectedDayEventIcon:{
  width:"38px",
  height:"38px",
  flexShrink:0,
  display:"flex",
  alignItems:"center",
  justifyContent:"center",
  borderRadius:"11px",
  background:"#fff0f4",
  fontSize:"18px"
},

selectedDayEventTitle:{
  fontSize:"13px",
  fontWeight:"800",
  color:"#65414d"
},

selectedDayEventDescription:{
  marginTop:"3px",
  fontSize:"11px",
  color:"#a27d89"
},
  
  monthCalendarCard:{
  padding:"18px",
  marginBottom:"18px",
  background:"#fff",
  borderRadius:"22px",
  border:"1px solid #f2e0e6",
  boxShadow:"0 8px 25px rgba(140,70,90,.06)"
},

monthCalendarHeader:{
  display:"flex",
  alignItems:"center",
  justifyContent:"space-between",
  marginBottom:"18px"
},

  monthCalendarTitleWrap:{
  display:"flex",
  flexDirection:"column",
  alignItems:"center",
  gap:"5px"
},

todayCalendarButton:{
  border:"none",
  background:"transparent",
  color:"#bd5878",
  fontSize:"10px",
  fontWeight:"800",
  cursor:"pointer",
  padding:"2px 6px"
},
  
  
monthCalendarTitle:{
  fontSize:"18px",
  fontWeight:"800",
  color:"#5c3542",
  textTransform:"capitalize"
},

monthCalendarArrow:{
  width:"40px",
  height:"40px",
  border:"none",
  borderRadius:"13px",
  background:"#fff0f4",
  color:"#bd5878",
  fontSize:"28px",
  lineHeight:"1",
  cursor:"pointer"
},

calendarWeekDays:{
  display:"grid",
  gridTemplateColumns:"repeat(7, 1fr)",
  gap:"5px",
  marginBottom:"7px"
},

calendarWeekDay:{
  textAlign:"center",
  fontSize:"10px",
  fontWeight:"800",
  color:"#b47789",
  padding:"5px 0"
},

calendarGrid:{
  display:"grid",
  gridTemplateColumns:"repeat(7, 1fr)",
  gap:"5px"
},

calendarEmptyDay:{
  minHeight:"54px"
},

calendarDay:{
  minHeight:"54px",
  padding:"6px 3px",
  border:"1px solid #f4e5ea",
  borderRadius:"13px",
  background:"#fff",
  color:"#65414d",
  fontSize:"14px",
  fontWeight:"700",
  cursor:"pointer",
  display:"flex",
  flexDirection:"column",
  alignItems:"center",
  justifyContent:"flex-start"
},

calendarToday:{
  background:"#fff0f4",
  border:"2px solid #e7a9bc",
  color:"#bd5878"
},

calendarSelectedDay:{
  boxShadow:"0 0 0 2px #bd5878 inset"
},

calendarEventDots:{
  display:"flex",
  alignItems:"center",
  justifyContent:"center",
  gap:"1px",
  marginTop:"4px",
  width:"100%",
  overflow:"hidden"
},

calendarEventDot:{
  fontSize:"11px",
  lineHeight:"1"
},
  
calendarNextCard:{
  display:"flex",
  alignItems:"center",
  gap:"13px",
  padding:"18px",
  marginBottom:"18px",
  borderRadius:"22px",
  background:"linear-gradient(135deg,#fff0f4,#fff8fa)",
  border:"1px solid #f3dce4",
  boxShadow:"0 8px 25px rgba(140,70,90,.07)"
},
specialDayCard:{
  display:"flex",
  alignItems:"center",
  gap:"14px",
  padding:"18px",
  marginBottom:"18px",
  borderRadius:"22px",
  background:"linear-gradient(135deg,#ffe8f0,#fff5f8)",
  border:"1px solid #f3cdd9",
  boxShadow:"0 8px 25px rgba(190,80,110,.10)"
},
specialDayIcon:{
  width:"52px",
  height:"52px",
  flexShrink:0,
  display:"flex",
  alignItems:"center",
  justifyContent:"center",
  borderRadius:"17px",
  background:"#fff",
  fontSize:"26px"
},
specialDayTitle:{
  fontSize:"10px",
  fontWeight:"800",
  letterSpacing:"1px",
  color:"#bd5878",
  marginBottom:"4px",
  textTransform:"uppercase"
},
specialDayText:{
  fontSize:"17px",
  fontWeight:"800",
  color:"#5c3542"
},
specialDayDescription:{
  marginTop:"5px",
  fontSize:"13px",
  color:"#9d7885"
},
  
calendarNextIcon:{
  width:"52px",
  height:"52px",
  flexShrink:0,
  display:"flex",
  alignItems:"center",
  justifyContent:"center",
  borderRadius:"17px",
  background:"#fff",
  fontSize:"26px"
},

calendarNextLabel:{
  fontSize:"9px",
  fontWeight:"800",
  letterSpacing:"1.3px",
  color:"#b47789",
  marginBottom:"4px"
},

calendarNextTitle:{
  fontSize:"17px",
  fontWeight:"800",
  color:"#5c3542"
},

calendarNextDate:{
  marginTop:"4px",
  fontSize:"12px",
  color:"#9d7885"
},

calendarCountdown:{
  flexShrink:0,
  padding:"8px 10px",
  borderRadius:"12px",
  background:"#fff",
  color:"#bd5878",
  fontSize:"12px",
  fontWeight:"800",
  textAlign:"center"
},

calendarEventCard:{
  display:"flex",
  alignItems:"flex-start",
  gap:"13px",
  padding:"17px",
  background:"#fff",
  borderRadius:"20px",
  border:"1px solid #f2e0e6",
  boxShadow:"0 6px 20px rgba(140,70,90,.05)"
},
editEventButton:{
  flexShrink:0,
  width:"38px",
  height:"38px",
  border:"none",
  borderRadius:"12px",
  background:"#fff0f4",
  color:"#bd5878",
  fontSize:"17px",
  cursor:"pointer"
},
      deleteEventButton:{
  flexShrink:0,
  width:"38px",
  height:"38px",
  border:"none",
  borderRadius:"12px",
  background:"#fff0f4",
  color:"#bd5878",
  fontSize:"17px",
  cursor:"pointer"
},
  
calendarEventIcon:{
  width:"46px",
  height:"46px",
  flexShrink:0,
  display:"flex",
  alignItems:"center",
  justifyContent:"center",
  borderRadius:"14px",
  background:"#fff0f4",
  fontSize:"23px"
},

calendarEventType:{
  fontSize:"9px",
  fontWeight:"800",
  letterSpacing:"1px",
  color:"#b47b8c",
  marginBottom:"4px",
  textTransform:"uppercase"
},

eventDays:{
  flexShrink:0,
  padding:"7px 9px",
  borderRadius:"11px",
  background:"#fff0f4",
  color:"#bd5878",
  fontSize:"11px",
  fontWeight:"800"
}
};

const rootElement=document.getElementById("root");
if(!rootElement) console.error("❌ Не знайдено елемент #root");
else createRoot(rootElement).render(<App/>);
