
import React,{useState}from'react';import{createRoot}from'react-dom/client';import{Heart,Camera,Gift,CalendarDays,Sparkles,UserRound,Plus,Lock,Dice5,Check,Send,ChevronRight,Trash2}from'lucide-react';import'./style.css';

const ideas=[['Вечір без телефонів','🍕 Улюблена їжа → 🎬 фільм → 💬 3 речі, за які ви вдячні одне одному.'],['Полювання за спогадами','📸 Знайдіть 5 місць, пов’язаних з вашими спогадами, і зробіть фото.'],['Домашнє кафе','☕ Приготуйте одне одному напій, десерт і влаштуйте побачення вдома.'],['Нічна прогулянка','🌙 Вийдіть ввечері, виберіть новий маршрут і поговоріть без телефонів.']];
const questions=['Який наш момент ти ніколи не забудеш?','Куди ти найбільше хочеш поїхати зі мною?','Що тобі найбільше подобається в наших стосунках?','Яке побачення ти мрієш зі мною провести?'];

function App(){
 const[t,setT]=useState('home'),[moments,setMoments]=useState([{title:'Наш перший момент',date:'14 вересня 2025',text:'Той день, коли все почалося ❤️'}]),[newM,setNewM]=useState({title:'',date:'',text:''}),[form,setForm]=useState(false),[idea,setIdea]=useState(0),[q,setQ]=useState(0),[answer,setAnswer]=useState(''),[sent,setSent]=useState(false),[miss,setMiss]=useState(false),[surprise,setSurprise]=useState(false),[events,setEvents]=useState([{title:'Наша річниця ❤️',date:'14 жовтня 2026',days:31}]);
 const add=()=>{if(!newM.title)return;setMoments([...moments,newM]);setNewM({title:'',date:'',text:''});setForm(false)};
 const nav=[['home','Головна',Heart],['moments','Моменти',Camera],['dates','Побачення',Sparkles],['surprises','Сюрпризи',Gift],['profile','Профіль',UserRound]];
 return <div className="app">
 <header><div className="logo"><Heart fill="currentColor"/> Ми</div><div className="status">● разом</div></header>
 <main>
 {t==='home'&&<><section className="hero"><div className="avatars"><span>😊</span><i>❤️</i><span>🥰</span></div><small>Ви разом</small><h1>1 рік 4 місяці</h1><p>Кожен день — ще одна сторінка вашої історії.</p></section>
 <section className="card question"><div className="eyebrow">✨ ПИТАННЯ ДНЯ</div><h2>{questions[q]}</h2>{!sent?<><textarea value={answer} onChange={e=>setAnswer(e.target.value)} placeholder="Напиши свою відповідь..."/><button className="primary" onClick={()=>setSent(true)}><Send/> Відповісти</button></>:<div className="success"><Check/> Відповідь збережено. Тепер чекаємо на партнера ❤️</div>}<button className="link" onClick={()=>{setQ((q+1)%questions.length);setAnswer('');setSent(false)}}>Інше питання</button></section>
 <div className="grid"><button className="card tile" onClick={()=>setT('moments')}><Camera/><b>{moments.length}</b><span>Моменти</span></button><button className="card tile" onClick={()=>setT('surprises')}><Gift/><b>1</b><span>Сюрприз</span></button><button className="card tile" onClick={()=>setT('dates')}><CalendarDays/><b>{events[0].days}</b><span>днів до події</span></button><button className="card tile" onClick={()=>setMiss(true)}><Heart/><b>🥺</b><span>Я сумую</span></button></div>
 {miss&&<div className="toast">💌 Повідомлення партнеру надіслано <button onClick={()=>setMiss(false)}>×</button></div>}</>}
 {t==='moments'&&<><div className="heading"><div><small>ВАША ІСТОРІЯ</small><h1>Наші моменти ❤️</h1></div><button className="round" onClick={()=>setForm(!form)}><Plus/></button></div>{form&&<div className="card form"><input placeholder="Назва" value={newM.title} onChange={e=>setNewM({...newM,title:e.target.value})}/><input placeholder="Дата" value={newM.date} onChange={e=>setNewM({...newM,date:e.target.value})}/><textarea placeholder="Опишіть момент" value={newM.text} onChange={e=>setNewM({...newM,text:e.target.value})}/><button className="primary" onClick={add}>Зберегти ❤️</button></div>}<div className="list">{moments.map((m,i)=><article className="card moment" key={i}><div className="momentPic">❤️</div><div><h3>{m.title}</h3><small>{m.date}</small><p>{m.text}</p></div></article>)}</div></>}
 {t==='dates'&&<><small>ПОБАЧЕННЯ</small><h1>Що зробимо разом?</h1><div className="card date"><div className="dateIcon">✨</div><h2>{ideas[idea][0]}</h2><p>{ideas[idea][1]}</p><button className="primary" onClick={()=>setIdea((idea+1)%ideas.length)}><Dice5/> Інша ідея</button><button className="secondary">❤️ Зберегти</button></div><div className="card mini"><b>🎯 Ціль пари</b><p>Провести 20 побачень</p><div className="progress"><span style={{width:'35%'}}/></div><small>7 з 20</small></div></>}
 {t==='surprises'&&<><small>ПРИВАТНО</small><h1>Сюрпризи 🎁</h1><div className="card locked"><Lock/><div><h3>Для тебе є сюрприз</h3><p>🔐 Відкриється 14 жовтня о 20:00</p></div></div>{surprise&&<div className="card form"><input placeholder="Заголовок сюрпризу"/><textarea placeholder="Текст, який побачить партнер"/><input type="datetime-local"/><button className="primary" onClick={()=>setSurprise(false)}>Створити сюрприз</button></div>}<button className="primary wide" onClick={()=>setSurprise(true)}><Plus/> Створити сюрприз</button></>}
 {t==='profile'&&<><small>ВАШ ПРОСТІР</small><h1>Профіль ❤️</h1><div className="card profile"><div className="big">😊</div><h2>Lemon & Partner</h2><p>Разом з 14 червня 2025</p><div className="code"><span>Код вашої пари</span><b>LOVE-7K92</b><button onClick={()=>navigator.clipboard?.writeText('LOVE-7K92')}>Копіювати</button></div><div className="row">Спільні моменти <b>{moments.length}</b></div><div className="row">Спільні цілі <b>1</b></div><button className="secondary wide">Налаштування</button></div></>}
 </main>
 <nav>{nav.map(([id,l,I])=><button className={t===id?'active':''} onClick={()=>setT(id)} key={id}><I/><span>{l}</span></button>)}</nav></div>}
const supabaseClient = window.supabaseClient;

async function startApp() {
    if (!supabaseClient) {
        document.body.innerHTML = `
            <div style="padding:30px;text-align:center;font-family:Arial">
                ❌ Помилка підключення Supabase
            </div>
        `;
        return;
    }

    const { data: { session } } =
        await supabaseClient.auth.getSession();

    if (!session) {
        window.location.href = "/login.html";
        return;
    }

    createRoot(document.getElementById('root')).render(<App />);
}

startApp();
