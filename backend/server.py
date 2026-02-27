from fastapi import FastAPI, APIRouter, HTTPException, Query, Request, Response, Cookie, Depends
from fastapi.responses import JSONResponse, FileResponse, HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import asyncio
import secrets
import hashlib
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict
import uuid
from datetime import datetime, date, timezone, timedelta
from zoneinfo import ZoneInfo
from enum import Enum
import httpx
import resend
import bcrypt
import stripe
from collections import defaultdict
import time

# AI Integration
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# AI Key - verify and log status at startup
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')
if not EMERGENT_LLM_KEY:
    logger.error("⚠️ CRITICAL: EMERGENT_LLM_KEY is not set! AI features will use fallback responses.")
else:
    logger.info("✅ EMERGENT_LLM_KEY is configured")

# Stockholm timezone helper
STOCKHOLM_TZ = ZoneInfo("Europe/Stockholm")

def today_str_stockholm() -> str:
    """Get today's date as YYYY-MM-DD string in Stockholm timezone"""
    return datetime.now(STOCKHOLM_TZ).strftime('%Y-%m-%d')

def now_stockholm() -> datetime:
    """Get current datetime in Stockholm timezone"""
    return datetime.now(STOCKHOLM_TZ)

def days_ago_stockholm(days: int) -> str:
    """Get date X days ago as YYYY-MM-DD string in Stockholm timezone"""
    return (datetime.now(STOCKHOLM_TZ) - timedelta(days=days)).strftime('%Y-%m-%d')

def days_ahead_stockholm(days: int) -> str:
    """Get date X days ahead as YYYY-MM-DD string in Stockholm timezone"""
    return (datetime.now(STOCKHOLM_TZ) + timedelta(days=days)).strftime('%Y-%m-%d')

# Webapp static files path
WEBAPP_DIR = ROOT_DIR / 'webapp_dist'

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Stripe config - No fallback, must be set in production
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY')
STRIPE_PUBLISHABLE_KEY = os.environ.get('STRIPE_PUBLISHABLE_KEY', '')
STRIPE_PRICE_MONTHLY = os.environ.get('STRIPE_PRICE_MONTHLY', '')
STRIPE_PRICE_YEARLY = os.environ.get('STRIPE_PRICE_YEARLY', '')

# In production, Stripe key is required - fail hard if missing
IS_PRODUCTION = os.environ.get('ENVIRONMENT', '').lower() == 'production'
if IS_PRODUCTION and not STRIPE_API_KEY:
    raise RuntimeError("CRITICAL: STRIPE_API_KEY must be set in production environment!")
elif not STRIPE_API_KEY:
    print("WARNING: STRIPE_API_KEY not set - Stripe payments will not work")

# Resend (Email) config
RESEND_API_KEY = os.environ.get('RESEND_API_KEY', '')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'noreply@honsgarden.se')
APP_URL = os.environ.get('APP_URL', '')  # Must be set in .env for deployment
if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY

# Admin config - comma-separated list of admin emails
ADMIN_EMAILS = [email.strip() for email in os.environ.get('ADMIN_EMAILS', '').split(',') if email.strip()]

# Free trial period (days)
FREE_TRIAL_DAYS = 7

# Weather API (OpenWeatherMap free tier)
WEATHER_API_KEY = os.environ.get('WEATHER_API_KEY', '')

# ============ HÖNSGÅRDSKUNSKAP - AI RÅDGIVARE "AGDA" ============
HONSGARD_KNOWLEDGE = """
Du är Agda, en erfaren hönsgårdsrådgivare med över 10 års erfarenhet av höns och småskalig äggproduktion. 
Du ger personliga, praktiska och varma råd baserade på användarens specifika situation - deras äggproduktion, väder, säsong och flockstorlek.

=== FILOSOFI OCH VÄRDERINGAR ===
Det finns något magiskt med att öppna redena på morgonen och hitta varma, nyvärpta ägg. Det är inte bara mat – det är resultatet av omsorg, rutiner och ett levande kretslopp. Att hålla höns är en livsstil.

Höns ger mer än ägg:
- Naturlig skadedjursbekämpning
- Fantastisk gödsel till trädgården
- Matrester som tas om hand effektivt
- Ett lugn och en närvaro i vardagen

En liten flock på 10–15 hönor kan producera mellan 2000 och 3500 ägg per år beroende på ras och skötsel.

=== HÄLSA & SJUKDOMAR ===

FRISK VS SJUK HÖNA - Lär dig känna igen skillnaden!
En FRISK höna är alert och nyfiken. Den springer mot dig när du kommer med mat, pickar aktivt, klöser i marken, stoftar sig, interagerar med flocken och har ett rakt, upprätt kroppsspråk. Ögonen är klara och runda, näbben är ren, fjäderdräkten är blank och tät (förutom under ruggning), och avföringen är fast med ett vitt uratutsöndring ovanpå.

En SJUK höna visar ofta något eller flera av följande:
- Sitter hopkurad, plufsig och med slutna ögon mitt på dagen
- Drar sig undan från flocken och vill vara ensam
- Slutar äta och dricka
- Vingarna hänger ner
- Onormal avföring (vattnig, grön, gul, blodig eller skummig)
- Andningsljud – rosslar, nyser, väser
- Svullen buk
- Bleka eller blåaktiga kammar och lökar (tecken på dålig syresättning eller blodbrist)
- Lös avföring runt fjädrarna vid kloaken
- Tappat vikt drastiskt – du känner bröstbenet som en kniv

VIKTIG REGEL: En höna som sitter för sig själv med slutna ögon under dagtid mår inte bra. Agera samma dag!

=== VANLIGA SJUKDOMAR (DETALJERAT) ===

MYKOPLASMA (CRD - Chronic Respiratory Disease):
En av de allra vanligaste sjukdomarna i svenska hönsflockar. Orsakas av bakterien Mycoplasma gallisepticum.
Symtom: nysningar, ögonflöde, svullna bihålor (ansiktet ser uppsvällt ut), rosslig andning.
Smittar via direktkontakt och via ägg till kycklingar. Stress, kallt och fuktigt väder utlöser ofta utbrott.
Kan behandlas med antibiotika (tetracyklin eller tylosin) men sjukdomen botas inte – hönsen förblir bärare livet ut.
Håll flocken stressfri, varm och torr för att minimera utbrott.

NEWCASTLESJUKA:
Allvarlig virussjukdom som i sin farligaste form kan slå ut en hel flock på några dagar. I Sverige vaccineras ofta mot detta.
Symtom: andningssvårigheter, neurologiska symptom (vrider på huvudet, går i cirklar), diarré, kraftigt nedsatt äggproduktion.
Det finns ingen behandling – sjuka djur avlivas. Misstänker du newcastlesjuka ska du kontakta veterinär omedelbart, det är en anmälningspliktig sjukdom i Sverige.

MAREKS SJUKDOM:
Ett herpesvirus som drabbar framför allt unga höns under 5 månaders ålder.
Orsakar förlamning i ben och vingar, tumörer i inre organ och ibland grå ögon (ögonformen förändras).
Det finns inget botemedel. Vaccination vid kläckning är det enda skyddet.
Viruset är extremt motståndskraftigt och kan leva år i damm och fjäder i hönshuset – byt flock med försiktighet och sanera ordentligt.

KOCCIDIOS:
Vanlig hos unga kycklingar 3–8 veckor. Orsakas av encelliga parasiter (Eimeria sp.) som angriper tarmväggen.
Symtom: blodig eller chokladbrun diarré, slöhet, blek kam, viktminskning och hög dödlighet om obehandlad.
Behandlas med koccidiostatika (t.ex. amprolium). Vuxna höns bygger upp immunitet, men kycklingar som aldrig exponerats är känsliga.
Håll kycklinghuset torrt – fukt är koccidios bästa vän!

SALMONELLA:
I Sverige är salmonella hos höns anmälningspliktig och övervakas aktivt.
Hönsen kan bära på salmonella utan att verka sjuka alls, men vid stress kan sjukdom bryta ut med diarré och nedsatt allmäntillstånd.
Viktigast ur folkhälsosynpunkt – tvätta händerna noggrant efter kontakt med höns och hantera ägg hygieniskt!

INFEKTIÖS BRONKIT (IB):
Ett virus som framför allt drabbar andningsvägarna men också njurarna och reproduktionsorganen.
Symtom: nysningar, rosslig andning, nedsatt värpning och missformade ägg (rynkiga, mjukskalade).
Sprids extremt snabbt via luften. Ingen behandling finns, men stödbehandling (vitaminer, elektrolyter, varmt och torrt) hjälper.
Vaccin finns men används framför allt i större besättningar.

BUMBLEFOOT (Plantardermatit):
En bakterieinfektion i trampdynan på foten, orsakad av Staphylococcus aureus och andra bakterier.
Uppstår när hönsen skadar foten mot vassa ytor, eller när de hoppar ner från för höga sittpinnar på hårt underlag.
Du ser en svart skorpa eller hård knöl under foten.
I tidigt stadium kan det behandlas hemma med såromläggning och antibiotika. I avancerade fall krävs kirurgisk rensning av veterinär.
Förebygg med mjuka landningsytor och lagom höga sittpinnar.

ÄGGLEDARINFLAMMATION OCH PERITONIT:
Vanligt hos äldre eller hög-producerande höns. Äggulan hamnar fel och hamnar i bukhålan istället för äggledaren, vilket leder till allvarlig infektion.
Symtom: svullen, vätskefylld buk (hönsen ser "pansad" ut underifrån), nedsatt allmäntillstånd, slutar värpa.
Kräver veterinär – antibiotika kan bromsa förloppet men prognosen är ofta dålig.
Spara inte på äggproduktionen hos hönsen, det sliter hårt på kroppen.

RÖDA HÖNSKVALSTER (Dermanyssus gallinae):
En av de vanligaste orsakerna till blodbrist och nedsatt värpning i Sverige.
Lever i springor i hönshuset dagtid och suger blod på hönsen nattetid.
Hönsen blir bleka, anemiska, slutar värpa och kan i värsta fall dö av blodbrist.
Du ser dem som rörliga röda/bruna prickar i springor och vid sittpinnefästen.
Bekämpning: rengör hönshuset noggrant, använd kiseldioxid (kiselgur) i springor, eller kemiska medel.
Behandla hönshuset, inte bara hönsen!

FJÄDERLÖSS (Mallophaga):
Lever i fjädrarna och äter fjäder och hudskrap.
Syns som rörliga prickar nära huden, ofta runt kloaken och under vingarna.
Orsakar klåda, rastlöshet och fjäderskador. Behandlas med insektspuder (permetrin).

SPOLMASKAR OCH BANDMASKAR:
Inälvsparasiter som hönsen får i sig via mark och mellanvärdar (sniglar, daggmaskar).
Avföring och minskad kondition avslöjar dem. Äggräkning via feces-analys hos veterinär ger svar.
Behandling med flubendazol (Flubenol) – receptfritt i Sverige.

=== ZOONOSER - Sjukdomar som kan smitta till människa ===
De viktigaste att känna till:
- Salmonella – via ägg och avföring. Tvätta alltid händerna.
- Campylobakter – vanlig tarmbakterie hos höns. Ger magsjuka hos människa. Tvätta händerna, koka/stek allt kött ordentligt.
- Fågelinfluensa (H5N1 m.fl.) – sällsynt men allvarlig. Vid misstanke om fågelinfluensa (massdöd, neurologiska symptom) kontakta Jordbruksverket omedelbart.
- Ringorm (Microsporum/Trichophyton) – svampinfektion som kan sitta i fjädrarna och smitta via hudkontakt.

=== BEHANDLING - HEMMA VS VETERINÄR ===

VAD KAN DU BEHANDLA HEMMA?
1. Lindriga sår och skrapsår: Rengör med koksaltlösning, applicera blåspray (aluminiumspray) som skyddar och avskräcker hackande flockmedlemmar. Isolera den skadade hönsen tills såret läkt.
2. Löss och yttre parasiter: Puderbehandling med permetrin eller växtbaserade alternativ (lavendel, dammaska). Behandla hela flocken och hönshuset samtidigt.
3. Lindriga matsmältningsproblem: Apple cider vinegar (ACV) i vattnet (1 msk per 4 liter) stimulerar tarmfloran och kan hjälpa vid lätt diarré. Ge probiotika (yoghurt eller specifika hönsprobiotika).
4. Dehydrering: Elektrolytlösning i vattnet (kan köpas eller blandas hemma med socker, salt och vatten).
5. Äggstopp i tidigt stadium: Se akuta situationer nedan.

NÄR MÅSTE DU SÖKA VETERINÄR?
- Andningssvårigheter som inte förbättras på ett dygn
- Misstänkt newcastlesjuka eller fågelinfluensa
- Svullen buk (misstänkt peritonit)
- Äggstopp som inte löser sig inom 24 timmar
- Neurologiska symptom (huvudvrider, förlamning)
- Massdöd i flocken utan uppenbar orsak
- Öppen fraktur eller djupa sår

VIKTIGT: Antibiotika till höns i Sverige kräver recept från veterinär. Det är olagligt att behandla med antibiotika utan recept.

ISOLERING AV SJUKA DJUR:
Ha alltid en "sjukbur" redo – en enkel kartong eller bur inomhus fungerar utmärkt. Placera den sjuka hönsen:
- Varmt (18–22°C)
- Tyst och lugnt
- Med lättillgängligt vatten och mat
- Synlig från flockens håll är bra om möjligt, så hon inte tappar sin plats i hackordningen helt
Återintroduktion efter sjukdom görs gradvis – låt hönsen vara i en avdelad del av hönsgården innan full integration.

=== VÄRPNING - VARFÖR VÄRPER DE DÅLIGT? ===

LJUS - Den viktigaste faktorn:
Höns behöver 14–16 timmars ljus per dygn för att värpa optimalt. Ljuset stimulerar hypofysen via ögat att frisätta ägglossningstriggerande hormoner. På vintern, när dagsljuset understiger 12 timmar, slutar många höns att värpa helt naturligt – det är inte ett fel, det är biologi.
Lösning: Installera ett timer-styrt artificiellt ljus i hönshuset. Lägg till ljus på morgonen (låt naturligt dagsljus avsluta dagen) för bäst resultat. Öka gradvis – inte mer än 1 timme per vecka.

RUGGNING:
En gång om året, vanligtvis på hösten, ruggar höns – de tappar fjädrar och växer nya. Under denna period slutar de flesta höns att värpa helt, i 6–12 veckor. Det är helt normalt och nödvändigt. En höna som ruggar och värper samtidigt sliter ut sig snabbt. Ge extra protein under ruggningen (solrosfrön, insekter, fiskmjöl) så går den snabbare.

ÅLDER:
En höna värper bäst under sitt första och andra levnadsår. Från år tre minskar äggproduktionen gradvis. Vid 4–5 års ålder lägger många höns bara sporadiskt. Det är normalt. Rasen spelar också roll – en Leghorn eller ISA Brown är avelad för maximal produktion och värper 280–320 ägg per år i toppform, medan en Brahma eller Orpington kanske lägger 150–180.

STRESS:
Höns är stressade varelser. Saker som stör värpningen:
- Predatorer (räv, mink, hök) även om de bara smiter förbi utan att döda
- Ny höna introduceras i flocken
- Flytt till nytt hönshus
- Ägare som byter rutiner
- Extrem värme eller kyla
- Sjukdom i flocken
En rädd höna lägger inga ägg. Det är evolutionärt klokt – man föder inte ungar i kris.

NÄRINGSBRIST:
Kalciumbrist är vanligast. En höna som lägger ägg förbrukar otroliga mängder kalcium – ett äggskals vikt är till 94% kalciumkarbonat. Om fodret inte räcker kompenserar kroppen med att ta kalcium från skelettet, vilket leder till osteoporos och mjukskalade ägg. Ge alltid fri tillgång till ostron-skal eller krossad kalksten.
Proteinbrist ger liknande effekt – utan tillräckligt protein kan kroppen inte bygga äggvitan. Ge 16–18% råprotein i fodret för värphöns.

DOLDA SJUKDOMAR:
Infektiös bronkit, mykoplasma och äggledarproblem påverkar alla värpningen. En höna som plötsligt slutar värpa utan annan uppenbar orsak bör undersökas.

OLAGDA ÄGG:
Ibland värper hönsen fint – men inte där du tror. Kontrollera om de hittat ett alternativt bo ute i trädgården, bakom häcken eller under buskar.

=== FODER & NÄRING (DETALJERAT) ===

BASFODRET:
Ge ett komplett värphönspellets eller värphönskross som basfoder. Det innehåller rätt balans av protein, energi, vitaminer och mineraler. Spannmål (vete, korn, havre) är ett bra komplement men ska inte ersätta pellets – spannmål är energirikt men näringsglesare.

VAD FÅR DE GÄRNA ÄTA SOM TILLSKOTT?
- Grönsaker och frukt: Kål, spenat, äpplen, gurka, tomater, majs – höns älskar det mesta. Hängt kål i hönshuset ger också sysselsättning.
- Insekter och larver: Naturligt och proteinrikt. Soldatfluglarver (BSFL) är fantastiska – högt protein, bra fettsyror, och hönsen är galna i dem.
- Krossade ägg och äggskalen: Ja, du kan ge det tillbaka. Krossade ägg (kokta) ger protein, krossade skal ger kalcium.
- Grit (kvarts/granit): Höns har ingen tänder – de malar maten i muskelmagen med hjälp av stenar. Ge fri tillgång till grit, speciellt om de inte har tillgång till naturmark.
- Fiskmjöl och torkad fisk: Utmärkt proteinkälla.

VAD SKA DE ABSOLUT INTE ÄTA?
- Avokado – giftig, kan vara dödlig (persin)
- Lök och vitlök i stora mängder – bryter ner röda blodkroppar
- Rå potatis och gröna potatisskal – innehåller solanin som är giftigt
- Choklad och kaffe – teofyllin och koffein är giftiga
- Salt i stora mängder – kan orsaka saltförgiftning
- Rått kött och fisk – risk för salmonella och campylobakter
- Mögligt foder – mykotoxiner från mögel är mycket farliga
- Pärlhyacint, digitalis och andra giftiga trädgårdsväxter

VATTEN:
Ofta underskattat. En värphöna dricker 200–500 ml vatten per dag – mer i värme. Smutsigt eller för varmt/kallt vatten minskar intaget drastiskt. Rengör vattenhinkar dagligen. På vintern, se till att vattnet inte fryser – en höna utan vatten i ett par timmar på en het dag kan dö!

=== HÖNSGÅRDENS UTFORMNING ===

PLACERING:
- Välj plats med bra dränering - höns hatar lera
- Fukt leder till bakterier, parasiter och dålig luft
- Morgonsol är guld värd, särskilt vintertid
- Skydd mot starka vindar är lika viktigt

UTRYMME:
- Minst 0,25 m² per höna inomhus (ju mer desto bättre)
- 1–2 m² per höna i rastgård
- Ju mer plats, desto lugnare flock = bättre äggproduktion

ROVDJURSSKYDD:
- Rävar gräver - gräv ner nät minst 30 cm
- Minkar pressar sig genom små öppningar
- Rovfåglar slår uppifrån - tak eller nät
- Säkra alla dörrar med ordentliga lås

=== HÖNSHUSETS UTFORMNING ===

SITTPINNAR:
Runda eller ovala pinnar, 3–5 cm i diameter. Höns sover på pinne och viker fötterna runt den – flat yta ger bumblefoot. Höjd 40–60 cm från golvet är lagom för de flesta raser.

REDEN:
En per 4–5 höns räcker, höns delar gärna. Placera reden mörkt och lite avsides – det triggar instinkten att värpa i skyddad miljö. Storlek ca 30x30x30 cm.

VENTILATION:
Kritiskt och ofta underskattat. Dålig ventilation ger fukt, ammoniak och andningssjukdomar. Ventilationshål ska sitta högt upp (varm, fuktig luft stiger), men undvik drag direkt mot sittpinnarna.

TEMPERATUR:
Höns klarar kyla bra (ner till -10°C och lägre) om de är friska och hönshuset är torrt och dragfritt. De klarar inte fukt och drag. På sommaren är värme ett större problem – sätt upp skugga, ge kallt vatten och öppna ventilation.

=== HACKORDNING OCH BETEENDEPROBLEM ===

Hackordningen är reell och brutal. Varje flock har en tydlig hierarki, och det är viktigt att respektera det. Introducera aldrig en ny höna direkt i flocken – den kommer att attackeras och kan skadas allvarligt.

INTRODUKTION AV NY HÖNA:
1. Karantän i 2–4 veckor (skydd mot sjukdom)
2. Synlig men separerad i 1–2 veckor (de vänjer sig vid varandra genom nät)
3. Nattintroduktion (lägg in den nya på pinnen när alla sover – på morgonen verkar det mer naturligt)
4. Övervaka de första dagarna

FJÄDERPLOCKNING OCH KANNIBALISM:
Stressrelaterade beteenden. Orsakas av för trång miljö, för lite stimulans, proteinbrist eller att en höna fått sår och andra börjat picka.
Åtgärda grundorsaken. Blåspray på sår, mer utrymme, mer stimulans (hängd kål, halmbalar, pickstenar).

FÖREBYGGANDE STOFTBAD:
Ge alltid tillgång till torr jord eller sand för stoftbad. Det är hönsets naturliga sätt att hålla parasiter i schack. Tillsätt lite kiseldioxid i stoftbadet för extra effekt.

=== AKUTA SITUATIONER ===

ÄGGSTOPP (Egg Binding):
En av de vanligaste akutfallen. Hönsen har ett ägg fastnat i äggledaren och kan inte lägga det. Dödligt om obehandlat.

Symtom: Hönsen sitter hopkurad, anstränger sig och "trycker", buk kan vara svullen, går med stjärten nere, kan inte sitta på pinnen, slutar äta.

Hembehandling (om tidigt stadium):
1. Placera hönsen i ett varmt bad (40°C) i 15–20 minuter – slappnar av musklerna
2. Torka henne och håll henne varm (handdukar, värmelampa)
3. Tillför kalcium (kalciumgluknat om du har, annars lite mjölk)
4. Smörj kloaken försiktigt med lite vaselin eller olivolja
5. Låt henne vara i lugn och ro i varmt utrymme
6. Upprepa badet efter 2–4 timmar om inget hänt

Sök veterinär omedelbart om: Hönsen fortfarande inte lagt ägget efter 24 timmar, om hon verkar förlamad i benen (ägget kan trycka på nerv), eller om hon kollapsar.
Bryt ALDRIG ägget inuti hönsen om du inte är utbildad – äggskal kan skada äggledaren allvarligt.

PREDATORANGREPP OCH SÅR:
Räv, mink och hök kan orsaka fruktansvärda skador. Hönsen kan överleva förvånansvärt allvarliga skador om du agerar snabbt.
1. Isolera omedelbart – chock och stress dödar lika gärna som såret
2. Rengör sår med koksaltlösning, aldrig ren sprit
3. Kontrollera om inre organ syns (det händer) – täck med fuktig gasbinda och kontakta veterinär AKUT
4. Håll varmt, tyst, mörkt
5. Ge elektrolytlösning om hönsen dricker

BLODIG PICKNING:
Kan eskalera till kannibalism och massdöd inom timmar. En höna med blod på sig triggar flockens instinkt att angripa. Ta ut den skadade direkt, rengör såret och applicera blåspray (färgar huden blå och döljer blod).

VÄRMESLAG:
Vid extrem värme kan höns snabbt få värmeslag. Symtom: gispar, utspärrade vingar, hänger med näbben, vacklar.
Åtgärd: Flytta till svalt och skuggigt. Blöt ner kammen och benen med svalt (inte iskallt) vatten. Ge elektrolytlösning. Fläkt om möjligt.

TECKEN PÅ ATT EN HÖNA HÅLLER PÅ ATT DÖ:
Var ärlig med dig själv. En höna som:
- Inte reagerar på din kontakt
- Ligger ner och inte kan resa sig
- Har blå/svart kam och lökar
- Andas med öppen näbb och sluten ögon
- Är iskall trots värme
...är troligtvis i slutskedet. Avlivning är i dessa fall en nåd. Kontakta veterinär för råd eller avlivning om du inte kan göra det själv.

=== OM TUPPAR ===

BEHÖVER DU EN TUPP?
Nej, för ägg behövs ingen tupp. Ja, om du vill ha kycklingar. En tupp skyddar också flocken – han spanar efter rovdjur, kallar hönsen till mat och håller hackordningen i schack.

EN BRA TUPP:
- Håller ordning i flocken
- Varnar vid fara
- Ser till att flocken rör sig samlat
- Kan minska stress och bråk bland hönorna

AGGRESSION HOS TUPPAR:
Vanligt och kan vara farligt, speciellt mot barn. Uppfostran spelar roll – en tupp som behandlats som en leksak som unge kan bli aggressiv. Aldrig låt tuppar hoppa på dig utan att du reagerar – det tolkar de som att du accepterar underordning. Stå din grund, gå mot dem, inte ifrån.

HÄLSOPROBLEM HOS TUPPAR:
Delvis desamma som hos höns, men de drabbas mer av sporskador (sporar kan fastna, växa in och infekteras), och de är mer känsliga för kyla i kammen (rosenkam eller vallbykam är bättre i kallt klimat).

SPORRKLIPPNING:
Sporarna kan växa långa och böja sig tillbaka mot benet. Trimma dem med en bultavbitare eller sök hjälp – känsligt men nödvändigt.

TUPPEN OCH HÖNSEN:
En tupp klarar ca 8–12 höns. Med för få höns kan han överbetäcka dem och orsaka fjäderskador och stress. Med för många tappar han kontrollen.

KRÅKANDET:
Det kan inte tränas bort och det slutar inte kl. 06.00. Sov gott!

=== HÖNSRASER FÖR ÄGGPRODUKTION ===

HÖGPRODUCERANDE VÄRPRASER (280-320 ägg/år):
- Lohmann, Isa Brown, Bovans
- Perfekt för jämn tillgång och kontinuerlig försäljning

TRADITIONELLA RASER (200-250 ägg/år):
- Sussex, Rhode Island Red, Plymouth Rock
- Robustare, klarar kallt klimat bättre
- Lugna och trevliga i flocken

SPECIALRASER MED MERVÄRDE:
- Maran: mörkbruna chokladägg
- Araucana: blå eller gröna ägg
- Färgvariation säljer! Kunder älskar blandade äggkartonger

=== ÅRSTIDER OCH VÄDER ===

VINTER:
- Kortare dagar = mindre ägg
- Använd belysning för 14-16 timmars ljus per dag
- Överdriv inte - hönsen behöver vila också
- Kontrollera att vattnet inte fryser
- Extra foder för värme

SOMMAR:
- Värmestress är farligt
- Skugga och ventilation avgörande
- Höns svettas inte - de flåsar
- Öppen näbb = för varmt

RUGGNING (oftast hösten):
- Naturlig fjäderfällning
- Äggproduktionen minskar drastiskt
- Kroppen prioriterar fjäderbyte före ägg
- Ge extra protein (solrosfrön, insekter, fiskmjöl)

=== EKONOMI ===

HÅLL KOLL PÅ:
- Foderkostnad per höna
- Antal ägg per vecka
- Förluster (döda höns, spruckna ägg)

POTENTIELL AVKASTNING:
- 10-15 höns = 2000-3500 ägg/år
- Vid 4-6 kr/ägg = 8000-21000 kr/år i intäkter
- Minus foderkostnad ca 300-500 kr/höna/år

RIKTPRISER:
- Gårdsägg: 4–6 kr styck eller mer
- Ekologiska och färgglada ägg: högre pris motiverat

=== KONTEXTBASERADE TIPS ===

TIPS VID LÅG ÄGGPRODUKTION:
1. Kontrollera ljustillgång (14-16 timmar)
2. Granska foderkvalitet och kalciumtillgång
3. Se över stressfaktorer (trångboddhet, rovdjur)
4. Kontrollera för sjukdom eller parasiter
5. Fundera på flockens ålder och eventuell ruggning

TIPS VID KALLT VÄDER (<5°C):
1. Extra foder på kvällen för värmeproduktion
2. Kontrollera att vattnet inte fryser
3. Se till att huset är dragfritt men ventilerat
4. Överväg tillskottsbelysning
5. Ge lite extra spannmål på kvällen

TIPS VID VARMT VÄDER (>25°C):
1. Säkerställ skugga i rastgården
2. Extra vattenstationer med svalt vatten
3. Maximal ventilation
4. Undvik att störa under hetaste timmarna
5. Kall frukt/grönsaker som godis (vattenmelon!)

TIPS FÖR NYA HÖNSHÅLLARE:
1. Börja med tåliga, lättskötta raser
2. Investera i bra hönshus och rovdjursskydd
3. Etablera rutiner från dag ett
4. Observera dina höns dagligen - lär känna normalt beteende
5. Ha alltid kalcium och grit tillgängligt

TIPS VID MISSTÄNKT SJUKDOM:
1. Isolera den sjuka hönsen OMEDELBART
2. Håll henne varm (18-22°C), tyst och med tillgång till vatten
3. Observera symtom noggrant (andning, avföring, beteende)
4. Kontakta veterinär om symtomen inte förbättras inom 24 timmar
5. Smittsamma sjukdomar kräver karantän för hela flocken

=== ÄGGKVALITET ===

ETT BRA ÄGG:
- Hårt, helt skal
- Fast och hög äggvita
- Rund och intensivt färgad gula

FÄRSKHETSTEST:
- Färska ägg sjunker i vatten och lägger sig platt på botten
- Äldre ägg ställer sig på ända
- Gamla ägg flyter - ät inte!

SMAK PÅVERKAS AV:
- Fodret - mer grönt och insekter = djupare smak
- Hur hönsen lever - frigående höns med varierad kost ger godare ägg
- Årstid - sommarägg smakar ofta annorlunda än vinterägg

SKAL-PROBLEM:
- Mjuka skal = kalciumbrist, ge ostronskalskal
- Rynkiga skal = infektiös bronkit eller stress
- Blodprickar inuti = normalt, ofarligt
- Dubbla gulor = unga höns med oregelbunden ägglossning

=== FÖRVARING AV ÄGG ===
- Ägg håller 4–6 veckor i kylskåp
- Förvara svalt och jämnt (5-10°C)
- Tvätta INTE ägg i onödan - det naturliga skyddsskiktet (kutikula) är viktigt
- Märk kartonger med värpdatum
- Förvara med spetsen neråt för längre hållbarhet

=== FÖRSÄLJNING AV ÄGG ===

REGLER I SVERIGE:
- Stalldörrförsäljning (max 15 höns): Inga krav på märkning
- Större försäljning: Kräver registrering hos Jordbruksverket
- Saluhållning på torg/marknad: Krav på kylförvaring och märkning

PRISSÄTTNING:
- Foderkostnad + investering + din tid = minimipris
- Gårdsägg: 4–6 kr styck eller mer
- Ekologiska och färgglada ägg: högre pris motiverat
- Undervärdera INTE ditt arbete!

=== HÅLLBARHET OCH KRETSLOPP ===
- Hönsgödsel är guld för trädgården - kompostera eller sprid direkt
- Matrester blir ägg - perfekt kretslopp
- Ogräs och trädgårdsavfall blir näring
- Gamla fjädrar kan komposteras
- Äggskal krossas och ges tillbaka som kalciumtillskott
- Cirkulärt, naturligt och smart

=== SÄSONGSKALENDER ===

JANUARI-FEBRUARI:
- Lägsta äggproduktion
- Extra belysning viktigt
- Kontrollera att vatten inte fryser
- Extra energirikt foder

MARS-APRIL:
- Produktionen ökar med ljuset
- Vårruggning kan förekomma
- Dags att förbereda för kycklingar?

MAJ-JUNI:
- Högsäsong för ägg!
- Överskott? Sälj, konservera eller ge bort
- Se upp för kvalster - de trivs i värme

JULI-AUGUSTI:
- Värmevarning! Se till att höns har skugga
- Extra vatten, kanske frysta godisar (frukt i isblock)
- Produktionen kan minska vid extrem värme

SEPTEMBER-OKTOBER:
- Höstruggning - produktionen minskar
- Extra protein för fjädertillväxt
- Förbered hönshuset för vintern

NOVEMBER-DECEMBER:
- Kort ljus = få ägg (helt normalt)
- Belysning om du vill ha ägg
- Underhåll och reparationer i hönshuset
"""

# Import Stripe checkout helper
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============ ENUMS ============
class TransactionType(str, Enum):
    COST = "cost"
    SALE = "sale"

class TransactionCategory(str, Enum):
    FEED = "feed"
    EQUIPMENT = "equipment"
    MEDICINE = "medicine"
    OTHER_COST = "other_cost"
    EGG_SALE = "egg_sale"
    HEN_SALE = "hen_sale"
    OTHER_INCOME = "other_income"

class SubscriptionPlan(str, Enum):
    MONTHLY = "monthly"
    YEARLY = "yearly"

# ============ AUTH MODELS ============
class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserSession(BaseModel):
    user_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SessionRequest(BaseModel):
    session_id: str

# Email/Password Auth Models
class EmailRegister(BaseModel):
    email: EmailStr
    password: str
    name: Optional[str] = None
    accepted_terms: bool = False
    accepted_marketing: bool = False
    referral_code: Optional[str] = None  # For referral bonus

class EmailLogin(BaseModel):
    email: EmailStr
    password: str
    remember_me: bool = False  # For web "Kom ihåg mig" feature

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordReset(BaseModel):
    token: str
    new_password: str

class MagicLinkRequest(BaseModel):
    next_url: Optional[str] = "/"  # Where to redirect after login

class ReferralInfo(BaseModel):
    referral_code: str
    referral_link: str
    referrals_count: int
    bonus_days_earned: int

# ============ COOP/DATA MODELS ============
class CoopSettings(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str  # Required - no default
    coop_name: str = "Min Hönsgård"
    hen_count: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class CoopSettingsUpdate(BaseModel):
    coop_name: Optional[str] = None
    hen_count: Optional[int] = None

# ============ FEATURE PREFERENCES MODEL ============
class FeaturePreferences(BaseModel):
    """User preferences for which features to show/hide"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    # Feature toggles (all on by default)
    show_flock_management: bool = True
    show_health_log: bool = True
    show_feed_management: bool = True
    show_weather_data: bool = True
    show_hatching_module: bool = True
    show_productivity_alerts: bool = True
    show_economy_insights: bool = True
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class FeaturePreferencesUpdate(BaseModel):
    show_flock_management: Optional[bool] = None
    show_health_log: Optional[bool] = None
    show_feed_management: Optional[bool] = None
    show_weather_data: Optional[bool] = None
    show_hatching_module: Optional[bool] = None
    show_productivity_alerts: Optional[bool] = None
    show_economy_insights: Optional[bool] = None

# ============ AFFILIATE/PRODUCT RECOMMENDATION MODELS ============
class ProductCategory(str, Enum):
    FEED = "feed"
    SUPPLEMENTS = "supplements"
    EQUIPMENT = "equipment"
    LIGHTING = "lighting"
    HEALTH = "health"
    HOUSING = "housing"
    WATER = "water"
    OTHER = "other"

class ProductRecommendation(BaseModel):
    """A product recommendation with affiliate link"""
    id: str
    name: str
    description: str
    category: str
    price: Optional[str] = None
    affiliate_url: str
    image_url: Optional[str] = None
    trigger_conditions: List[str] = []  # e.g., ["low_eggs", "winter", "new_user"]
    priority: int = 1  # Higher = more important

# Pre-defined product recommendations (will be populated from Adtraction feed later)
# For now, these are placeholder examples with bonden.se structure
PRODUCT_RECOMMENDATIONS = [
    {
        "id": "feed-1",
        "name": "Värphönsfoder Premium",
        "description": "Komplett foder för optimal äggproduktion med 18% protein och extra kalcium.",
        "category": "feed",
        "trigger_conditions": ["low_eggs", "winter"],
        "affiliate_url": "https://www.bonden.se/1853-foderutrustning",  # Placeholder
        "priority": 1
    },
    {
        "id": "supplements-1",
        "name": "Ostronskalskal",
        "description": "Naturlig kalciumkälla för starka äggskal. Fri tillgång rekommenderas.",
        "category": "supplements",
        "trigger_conditions": ["soft_shells", "low_eggs"],
        "affiliate_url": "https://www.bonden.se/1853-foderutrustning",
        "priority": 2
    },
    {
        "id": "lighting-1",
        "name": "LED-belysning med timer",
        "description": "Energisnål belysning för hönshuset. Förlänger dagsljuset för bättre värpning.",
        "category": "lighting",
        "trigger_conditions": ["winter", "low_eggs"],
        "affiliate_url": "https://www.bonden.se/1853-foderutrustning",
        "priority": 1
    },
    {
        "id": "health-1",
        "name": "Kiselgur kvalstermedel",
        "description": "Naturlig bekämpning av röda hönskvalster. Ströas i springor och på sittpinnar.",
        "category": "health",
        "trigger_conditions": ["summer", "parasites"],
        "affiliate_url": "https://www.bonden.se/1853-foderutrustning",
        "priority": 1
    },
    {
        "id": "water-1",
        "name": "Värmeplatta för vattenautomat",
        "description": "Håller vattnet frostfritt under vintern. Energisnål och säker.",
        "category": "water",
        "trigger_conditions": ["winter", "cold"],
        "affiliate_url": "https://www.bonden.se/1853-foderutrustning",
        "priority": 1
    },
]

# ============ HATCHING/INCUBATION MODELS (ETAPP 3) ============
class HatchingStatus(str, Enum):
    INCUBATING = "incubating"
    HATCHED = "hatched"
    FAILED = "failed"
    CANCELLED = "cancelled"

class HatchingCreate(BaseModel):
    """Create a new hatching/incubation record"""
    start_date: str  # YYYY-MM-DD
    egg_count: int
    hen_id: Optional[str] = None  # The broody hen, if natural
    incubator_name: Optional[str] = None  # Name of incubator if using one
    notes: Optional[str] = None
    expected_hatch_days: int = 21  # Default chicken incubation period

class HatchingUpdate(BaseModel):
    egg_count: Optional[int] = None
    notes: Optional[str] = None
    status: Optional[HatchingStatus] = None
    hatched_count: Optional[int] = None  # How many actually hatched
    actual_hatch_date: Optional[str] = None

class Hatching(BaseModel):
    """A hatching/incubation record"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    start_date: str
    expected_hatch_date: str  # Calculated from start_date + expected_hatch_days
    egg_count: int
    hen_id: Optional[str] = None
    incubator_name: Optional[str] = None
    notes: Optional[str] = None
    status: str = "incubating"
    hatched_count: Optional[int] = None
    actual_hatch_date: Optional[str] = None
    expected_hatch_days: int = 21
    notification_sent_3_days: bool = False
    notification_sent_1_day: bool = False
    notification_sent_hatch_day: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Hen(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str  # Required - no default
    name: str
    breed: Optional[str] = None
    color: Optional[str] = None
    birth_date: Optional[str] = None
    notes: Optional[str] = None
    is_active: bool = True
    flock_id: Optional[str] = None
    status: str = "active"  # active, sold, deceased
    status_date: Optional[str] = None
    last_seen: Optional[str] = None
    last_seen_warning_days: int = 3  # Default warning after 3 days
    hen_type: str = "hen"  # hen or rooster
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# ============ FLOCK MODELS ============
class FlockCreate(BaseModel):
    name: str
    description: Optional[str] = None

class Flock(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ============ HEN STATUS ENUM ============
class HenStatus(str, Enum):
    ACTIVE = "active"
    SOLD = "sold"
    DECEASED = "deceased"

class HenType(str, Enum):
    HEN = "hen"
    ROOSTER = "rooster"

# ============ HEN MODELS ============
class HenCreate(BaseModel):
    name: str
    breed: Optional[str] = None
    color: Optional[str] = None
    birth_date: Optional[str] = None
    notes: Optional[str] = None
    flock_id: Optional[str] = None
    hen_type: HenType = HenType.HEN  # Default to hen

class HenUpdate(BaseModel):
    name: Optional[str] = None
    breed: Optional[str] = None
    color: Optional[str] = None
    birth_date: Optional[str] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None
    flock_id: Optional[str] = None
    status: Optional[HenStatus] = None
    status_date: Optional[str] = None
    last_seen: Optional[str] = None
    last_seen_warning_days: Optional[int] = None
    hen_type: Optional[HenType] = None

class EggRecord(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str  # Required - no default
    date: str
    count: int
    hen_id: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class EggRecordCreate(BaseModel):
    date: str
    count: int
    hen_id: Optional[str] = None
    notes: Optional[str] = None

class EggRecordUpdate(BaseModel):
    count: Optional[int] = None
    hen_id: Optional[str] = None
    notes: Optional[str] = None

class Transaction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str  # Required - no default
    date: str
    type: TransactionType
    category: TransactionCategory
    amount: float
    description: Optional[str] = None
    quantity: Optional[int] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

# ============ HEALTH LOG MODELS ============
class HealthLogType(str, Enum):
    SICK = "sick"
    MOLTING = "molting"
    VET_VISIT = "vet_visit"
    VACCINATION = "vaccination"
    DEWORMING = "deworming"
    INJURY = "injury"
    RECOVERED = "recovered"
    NOTE = "note"

class HealthLog(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    hen_id: str
    date: str
    type: HealthLogType
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class HealthLogCreate(BaseModel):
    hen_id: str
    date: str
    type: HealthLogType
    description: Optional[str] = None

class TransactionCreate(BaseModel):
    date: str
    type: TransactionType
    category: TransactionCategory
    amount: float
    description: Optional[str] = None
    quantity: Optional[int] = None

# ============ FEED MANAGEMENT MODELS (ETAPP 4) ============
class FeedType(str, Enum):
    LAYER_FEED = "layer_feed"          # Värpfoder
    GROWER_FEED = "grower_feed"        # Tillväxtfoder
    STARTER_FEED = "starter_feed"      # Startfoder
    SCRATCH_GRAIN = "scratch_grain"    # Korn/vete
    TREATS = "treats"                  # Godis/belöningar
    SUPPLEMENTS = "supplements"        # Tillskott
    OTHER = "other"

class FeedRecord(BaseModel):
    """Feed consumption/purchase record"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    date: str  # YYYY-MM-DD
    feed_type: FeedType
    amount_kg: float  # Amount in kg
    cost: Optional[float] = None  # Cost in SEK
    is_purchase: bool = False  # True = purchase, False = consumption
    brand: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class FeedRecordCreate(BaseModel):
    date: str
    feed_type: FeedType
    amount_kg: float
    cost: Optional[float] = None
    is_purchase: bool = False
    brand: Optional[str] = None
    notes: Optional[str] = None

class FeedRecordUpdate(BaseModel):
    date: Optional[str] = None
    feed_type: Optional[FeedType] = None
    amount_kg: Optional[float] = None
    cost: Optional[float] = None
    is_purchase: Optional[bool] = None
    brand: Optional[str] = None
    notes: Optional[str] = None

class FeedInventory(BaseModel):
    """Current feed inventory"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    feed_type: FeedType
    current_stock_kg: float = 0.0
    low_stock_threshold_kg: float = 5.0  # Alert when below this
    brand: Optional[str] = None
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ============ SUBSCRIPTION MODELS ============
class PremiumStatusResponse(BaseModel):
    is_premium: bool
    subscription_id: Optional[str] = None
    plan: Optional[str] = None
    expires_at: Optional[str] = None
    stripe_customer_id: Optional[str] = None

class CreateCheckoutRequest(BaseModel):
    plan: str  # "monthly" or "yearly"
    origin_url: str

class CreateCheckoutResponse(BaseModel):
    url: str
    session_id: str

class CancelSubscriptionRequest(BaseModel):
    reason: Optional[str] = None

# ============ FEEDBACK MODELS ============
class FeedbackCreate(BaseModel):
    type: str  # "feature", "bug", "improvement", "other"
    message: str
    email: Optional[str] = None

class Feedback(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: Optional[str] = None
    type: str
    message: str
    email: Optional[str] = None
    status: str = "new"  # "new", "read", "replied"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ============ COMMUNITY MODELS ============
class CommunityCategory(str, Enum):
    EGGS = "eggs"           # 🥚 Äggproduktion
    HEALTH = "health"       # 🐔 Hälsa & Sjukdom
    HOUSING = "housing"     # 🏠 Hönshus & Utrustning
    FEED = "feed"           # 🍽️ Foder
    OTHER = "other"         # ❓ Övrigt

CATEGORY_LABELS = {
    "eggs": {"sv": "🥚 Äggproduktion", "en": "🥚 Egg Production"},
    "health": {"sv": "🐔 Hälsa & Sjukdom", "en": "🐔 Health & Disease"},
    "housing": {"sv": "🏠 Hönshus & Utrustning", "en": "🏠 Housing & Equipment"},
    "feed": {"sv": "🍽️ Foder", "en": "🍽️ Feed"},
    "other": {"sv": "❓ Övrigt", "en": "❓ Other"},
}

class CommunityPostCreate(BaseModel):
    content: str
    category: str = "other"
    include_stats: bool = False  # Include user's coop stats

class CommunityPost(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_name: str  # Display name
    content: str
    category: str = "other"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    likes: int = 0
    liked_by: List[str] = []
    is_hidden: bool = False  # Admin can hide posts
    hidden_reason: Optional[str] = None
    # Optional coop stats
    coop_stats: Optional[dict] = None  # {"coop_name": "", "hen_count": 5, "eggs_this_week": 20, "avg_per_day": 2.8}

# ============ SPONSORED/AFFILIATE POSTS ============
class SponsoredPostCreate(BaseModel):
    """Admin creates sponsored posts that appear in the community feed"""
    title: str
    content: str
    category: str = "other"
    affiliate_url: Optional[str] = None
    discount_code: Optional[str] = None
    discount_percent: Optional[int] = None
    image_url: Optional[str] = None
    # Targeting
    trigger_conditions: List[str] = []  # ["winter", "summer", "low_eggs", "always"]
    start_date: Optional[str] = None  # YYYY-MM-DD
    end_date: Optional[str] = None    # YYYY-MM-DD
    is_active: bool = True
    priority: int = 1  # Higher = more likely to show

class SponsoredPost(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    content: str
    category: str = "other"
    affiliate_url: Optional[str] = None
    discount_code: Optional[str] = None
    discount_percent: Optional[int] = None
    image_url: Optional[str] = None
    trigger_conditions: List[str] = []
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    is_active: bool = True
    priority: int = 1
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    clicks: int = 0  # Track affiliate link clicks
    impressions: int = 0  # Track how many times shown

# Pre-configured sponsored posts (can be managed via admin later)
DEFAULT_SPONSORED_POSTS = [
    {
        "id": "sponsor-winter-light",
        "title": "Tips för mörka vinterdagar! 💡",
        "content": "Visste du att höns behöver 14-16 timmar ljus för att värpa optimalt? En LED-lampa med timer kan göra stor skillnad på vintern. Kolla in våra rekommenderade belysningslösningar!",
        "category": "housing",
        "affiliate_url": "https://www.bonden.se/1853-foderutrustning",
        "trigger_conditions": ["winter"],
        "is_active": True,
        "priority": 2
    },
    {
        "id": "sponsor-calcium",
        "title": "Mjuka skal? Prova detta! 🥚",
        "content": "Kalciumbrist är en vanlig orsak till tunna äggskal. Ostronskalskal ger dina höns det kalcium de behöver för starka, fina ägg. Naturligt och effektivt!",
        "category": "feed",
        "affiliate_url": "https://www.bonden.se/1853-foderutrustning",
        "trigger_conditions": ["always"],
        "is_active": True,
        "priority": 1
    },
    {
        "id": "sponsor-summer-water",
        "title": "Håll dina höns svala i värmen! ☀️",
        "content": "Sommarvärme kan vara farligt för höns. En extra vattenautomat och skuggplats kan rädda liv. Kolla in våra tips och produkter för en sval sommar!",
        "category": "housing",
        "affiliate_url": "https://www.bonden.se/1853-foderutrustning",
        "trigger_conditions": ["summer"],
        "is_active": True,
        "priority": 2
    },
    {
        "id": "sponsor-mites",
        "title": "Kvalster? Agera nu! 🐛",
        "content": "Röda hönskvalster är vanligast på sommaren och kan orsaka blodbrist och nedsatt värpning. Kiselgur är ett naturligt och effektivt sätt att bekämpa dem.",
        "category": "health",
        "affiliate_url": "https://www.bonden.se/1853-foderutrustning",
        "trigger_conditions": ["summer"],
        "is_active": True,
        "priority": 1
    },
]

# Forbidden patterns for content moderation (GDPR, phone numbers, etc.)
FORBIDDEN_PATTERNS = [
    r'\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b',  # Phone numbers (XXX-XXX-XXXX)
    r'\b\d{10,}\b',  # Long number sequences (phone numbers)
    r'\b07\d{8}\b',  # Swedish mobile numbers (07XXXXXXXX)
    r'\b\+46\s?\d{9,}\b',  # Swedish international format
    r'\b\d{6}[-]?\d{4}\b',  # Swedish personal numbers (YYYYMMDD-XXXX)
    r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',  # Email addresses
]

def check_forbidden_content(text: str) -> tuple[bool, str]:
    """Check if text contains forbidden content. Returns (is_ok, reason)"""
    import re
    
    text_lower = text.lower()
    
    # Check for phone numbers and personal data
    for pattern in FORBIDDEN_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            return False, "Innehållet verkar innehålla personlig information (telefonnummer, personnummer eller e-post). Av GDPR-skäl tillåts inte detta."
    
    # Check for offensive words (basic list, can be expanded)
    offensive_words = ['hora', 'fitta', 'kuk', 'fuck', 'shit', 'nazi', 'neger']
    for word in offensive_words:
        if word in text_lower:
            return False, "Innehållet bryter mot våra community-riktlinjer."
    
    return True, ""

# ============ REMEMBER TOKEN HELPER ============
async def _refresh_session_from_remember_token(request: Request, remember_token: str) -> Optional[User]:
    """Refresh session using remember token (web only)
    Rotates the remember token for security"""
    try:
        # Hash the provided token
        remember_hash = hashlib.sha256(remember_token.encode()).hexdigest()
        
        # Find valid remember token
        token_doc = await db.remember_tokens.find_one({
            "remember_hash": remember_hash,
            "revoked_at": None,
            "expires_at": {"$gt": datetime.now(timezone.utc)}
        })
        
        if not token_doc:
            return None
        
        user_id = token_doc["user_id"]
        
        # Get user
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            return None
        
        # Normalize user_id field
        if "id" in user and "user_id" not in user:
            user["user_id"] = user["id"]
        
        logger.debug(f"[Remember] Token refresh for user {user_id}")
        
        # Note: We can't set cookies from here easily in FastAPI
        # The session will be created by login or magic link
        # This is a limitation - for full rotation we'd need middleware
        
        return User(**user)
    except Exception as e:
        logger.error(f"[Remember] Error refreshing session: {e}")
        return None

# ============ AUTH HELPER FUNCTIONS ============
async def get_current_user(request: Request, response: Response = None) -> Optional[User]:
    """Get current user from session token in cookie or header
    Also supports remember_token rotation for web"""
    session_token = request.cookies.get("session_token")
    token_source = "cookie" if session_token else None
    
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header.split(" ")[1]
            token_source = "header"
    
    # If no session token, try remember_token (web only)
    if not session_token:
        remember_token = request.cookies.get("remember_token")
        if remember_token:
            # Try to refresh session using remember token
            user = await _refresh_session_from_remember_token(request, remember_token)
            if user:
                logger.debug(f"[Auth] Session refreshed from remember_token for user {user.user_id}")
                return user
    
    # Enhanced logging for debugging native auth issues
    request_path = request.url.path
    user_agent = request.headers.get("user-agent", "unknown")[:50]
    
    if not session_token:
        auth_header = request.headers.get("Authorization")
        logger.warning(f"[Auth 401] No session_token found for {request_path}")
        logger.warning(f"[Auth 401] Authorization header: {'present - ' + auth_header[:20] + '...' if auth_header else 'MISSING'}")
        logger.warning(f"[Auth 401] Cookie session_token: {'present' if request.cookies.get('session_token') else 'MISSING'}")
        logger.warning(f"[Auth 401] Host: {request.headers.get('host', 'unknown')}")
        logger.warning(f"[Auth 401] Origin: {request.headers.get('origin', 'unknown')}")
        logger.warning(f"[Auth 401] User-Agent: {user_agent}")
        logger.warning(f"[Auth 401] All headers: {dict(request.headers)}")
        return None
    
    session = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
    if not session:
        logger.warning(f"[Auth 401] Session NOT FOUND in DB for token ...{session_token[-6:]} (source: {token_source})")
        logger.warning(f"[Auth 401] Path: {request_path}, User-Agent: {user_agent}")
        return None
    
    # Check expiry
    expires_at = session.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        logger.warning(f"[Auth 401] Session EXPIRED for token ...{session_token[-6:]}, expired at {expires_at}")
        return None
    
    user = await db.users.find_one({"id": session["user_id"]}, {"_id": 0})
    if not user:
        # Try with user_id field as fallback (for older records)
        user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user:
        logger.warning(f"[Auth 401] User NOT FOUND for session user_id: {session['user_id']}")
        return None
    
    # Normalize user_id field
    if "id" in user and "user_id" not in user:
        user["user_id"] = user["id"]
    
    # Log successful auth for debugging
    logger.debug(f"[Auth OK] User {user['user_id']} authenticated via {token_source} for {request_path}")
    
    return User(**user)

async def require_user(request: Request) -> User:
    """Require authenticated user, raise 401 if not"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user

async def require_admin(request: Request) -> User:
    """Require admin user, raise 401/403 if not"""
    user = await require_user(request)
    if user.email not in ADMIN_EMAILS:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

# ============ AUTH ENDPOINTS ============
@api_router.post("/auth/session")
async def exchange_session(session_req: SessionRequest, request: Request, response: Response):
    """Exchange session_id from Emergent Auth for user data and session token"""
    # REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_req.session_id}
            )
            if resp.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid session")
            
            data = resp.json()
    except Exception as e:
        logger.error(f"Auth error: {e}")
        raise HTTPException(status_code=401, detail="Authentication failed")
    
    email = data.get("email")
    name = data.get("name", email.split("@")[0] if email else "User")
    picture = data.get("picture")
    session_token = data.get("session_token")
    
    # Find or create user
    existing_user = await db.users.find_one({"email": email}, {"_id": 0})
    if existing_user:
        user_id = existing_user["user_id"]
        # Update user info
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": name, "picture": picture}}
        )
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "created_at": datetime.now(timezone.utc),
            "reminder_enabled": True,  # Enable reminders by default
            "reminder_time": "18:00"   # Default reminder time
        })
        # Create default coop settings for new user
        await db.coop_settings.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "coop_name": "Min Hönsgård",
            "hen_count": 0,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        })
        # Give 7 days FREE trial premium
        trial_expires = datetime.now(timezone.utc) + timedelta(days=FREE_TRIAL_DAYS)
        await db.subscriptions.insert_one({
            "user_id": user_id,
            "is_active": True,
            "plan": "trial",
            "expires_at": trial_expires,
            "created_at": datetime.now(timezone.utc)
        })
        logger.info(f"New user {email} created with {FREE_TRIAL_DAYS}-day free trial")
    
    # Store session
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.delete_many({"user_id": user_id})  # Remove old sessions
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at,
        "created_at": datetime.now(timezone.utc)
    })
    
    # Set cookie
    # Set cookie - domain handling for production
    cookie_domain = None
    host = request.headers.get("host", "")
    if "emergent.host" in host:
        # Production deployment - set domain for full host
        cookie_domain = host.split(":")[0]  # Remove port if any
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 60 * 60,
        domain=cookie_domain
    )
    
    return {
        "user_id": user_id,
        "email": email,
        "name": name,
        "picture": picture
    }

@api_router.get("/auth/me")
async def get_me(request: Request):
    """Get current user info"""
    user = await require_user(request)
    return {
        "user_id": user.user_id,
        "email": user.email,
        "name": user.name,
        "picture": user.picture
    }

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    """Logout user"""
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_many({"session_token": session_token})
    
    response.delete_cookie(key="session_token", path="/", secure=True, samesite="none")
    return {"message": "Logged out"}

class DeleteAccountRequest(BaseModel):
    password: str
    confirmation: str = "DELETE"

@api_router.delete("/auth/delete-account")
async def delete_account(request: Request, response: Response, delete_req: DeleteAccountRequest, user: User = Depends(require_user)):
    """
    Delete user account and all associated data.
    Required for Google Play policy compliance.
    """
    # Verify confirmation text
    if delete_req.confirmation != "DELETE":
        raise HTTPException(status_code=400, detail="Bekräftelsestexten måste vara 'DELETE'")
    
    # Verify password
    user_data = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
    if not user_data:
        raise HTTPException(status_code=404, detail="Användare hittades inte")
    
    stored_password = user_data.get("password_hash")
    if stored_password:
        if not verify_password(delete_req.password, stored_password):
            raise HTTPException(status_code=401, detail="Fel lösenord")
    
    try:
        user_id = user.user_id
        
        # Delete all user data from all collections
        await db.users.delete_one({"user_id": user_id})
        await db.user_sessions.delete_many({"user_id": user_id})
        await db.coop_settings.delete_many({"user_id": user_id})
        await db.hens.delete_many({"user_id": user_id})
        await db.eggs.delete_many({"user_id": user_id})
        await db.notes.delete_many({"user_id": user_id})
        await db.hen_photos.delete_many({"user_id": user_id})
        await db.health_logs.delete_many({"user_id": user_id})
        await db.feed_logs.delete_many({"user_id": user_id})
        await db.feed_inventory.delete_many({"user_id": user_id})
        await db.hatching_batches.delete_many({"user_id": user_id})
        await db.subscriptions.delete_many({"user_id": user_id})
        await db.stripe_customers.delete_many({"user_id": user_id})
        await db.user_preferences.delete_many({"user_id": user_id})
        await db.chat_messages.delete_many({"user_id": user_id})
        
        # Clear session cookie
        response.delete_cookie(key="session_token", path="/", secure=True, samesite="none")
        
        logger.info(f"Account deleted: {user_id}")
        return {"message": "Ditt konto och all data har raderats", "success": True}
        
    except Exception as e:
        logger.error(f"Error deleting account: {e}")
        raise HTTPException(status_code=500, detail="Kunde inte radera kontot. Försök igen.")

# ============ MOBILE AUTH ENDPOINTS ============

class GoogleMobileAuth(BaseModel):
    google_id: str
    email: EmailStr
    name: str
    picture: Optional[str] = None
    access_token: str

class AppleMobileAuth(BaseModel):
    apple_id: str
    email: Optional[EmailStr] = None
    name: Optional[str] = None
    identity_token: Optional[str] = None
    authorization_code: Optional[str] = None

@api_router.post("/auth/google/mobile")
async def google_mobile_auth(request: Request, response: Response, auth_data: GoogleMobileAuth):
    """
    Authenticate user via Google Sign-In from mobile app
    This is for native Google OAuth (not web redirect flow)
    """
    try:
        email = auth_data.email
        name = auth_data.name or email.split("@")[0]
        picture = auth_data.picture
        google_id = auth_data.google_id
        
        # Find or create user
        existing_user = await db.users.find_one({"email": email}, {"_id": 0})
        if existing_user:
            user_id = existing_user["user_id"]
            await db.users.update_one(
                {"user_id": user_id},
                {"$set": {
                    "name": name,
                    "picture": picture,
                    "google_id": google_id,
                    "auth_provider": "google",
                    "last_login": datetime.now(timezone.utc)
                }}
            )
        else:
            user_id = f"user_{uuid.uuid4().hex[:12]}"
            await db.users.insert_one({
                "user_id": user_id,
                "email": email,
                "name": name,
                "picture": picture,
                "google_id": google_id,
                "auth_provider": "google",
                "created_at": datetime.now(timezone.utc),
                "reminder_enabled": True,
                "reminder_time": "18:00",
                "terms_accepted": datetime.now(timezone.utc)
            })
            await db.coop_settings.insert_one({
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "coop_name": "Min Hönsgård",
                "hen_count": 0,
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc)
            })
            trial_expires = datetime.now(timezone.utc) + timedelta(days=FREE_TRIAL_DAYS)
            await db.subscriptions.insert_one({
                "user_id": user_id,
                "is_active": True,
                "plan": "trial",
                "expires_at": trial_expires,
                "created_at": datetime.now(timezone.utc)
            })
            logger.info(f"New Google user {email} created via mobile")
        
        session_token = f"session_{uuid.uuid4().hex}"
        expires_at = datetime.now(timezone.utc) + timedelta(days=7)
        
        await db.user_sessions.delete_many({"user_id": user_id})
        await db.user_sessions.insert_one({
            "user_id": user_id,
            "session_token": session_token,
            "expires_at": expires_at,
            "auth_provider": "google",
            "platform": "mobile",
            "created_at": datetime.now(timezone.utc)
        })
        
        response.set_cookie(
            key="session_token",
            value=session_token,
            httponly=True,
            secure=True,
            samesite="none",
            path="/",
            max_age=7 * 24 * 60 * 60
        )
        
        return {
            "success": True,
            "user_id": user_id,
            "email": email,
            "name": name,
            "token": session_token
        }
        
    except Exception as e:
        logger.error(f"Google mobile auth error: {e}")
        raise HTTPException(status_code=500, detail="Authentication failed")

@api_router.post("/auth/apple/mobile")
async def apple_mobile_auth(request: Request, response: Response, auth_data: AppleMobileAuth):
    """
    Authenticate user via Apple Sign-In from iOS app
    Note: Apple only provides email/name on FIRST sign-in
    """
    try:
        apple_id = auth_data.apple_id
        
        existing_user = await db.users.find_one({"apple_id": apple_id}, {"_id": 0})
        
        if existing_user:
            user_id = existing_user["user_id"]
            email = existing_user.get("email")
            name = existing_user.get("name")
            await db.users.update_one(
                {"user_id": user_id},
                {"$set": {"last_login": datetime.now(timezone.utc)}}
            )
        else:
            email = auth_data.email
            name = auth_data.name
            
            if not email:
                email = f"apple_{apple_id[:8]}@privaterelay.appleid.com"
            if not name:
                name = "Apple-användare"
            
            user_id = f"user_{uuid.uuid4().hex[:12]}"
            await db.users.insert_one({
                "user_id": user_id,
                "email": email,
                "name": name,
                "apple_id": apple_id,
                "auth_provider": "apple",
                "created_at": datetime.now(timezone.utc),
                "reminder_enabled": True,
                "reminder_time": "18:00",
                "terms_accepted": datetime.now(timezone.utc)
            })
            
            await db.coop_settings.insert_one({
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "coop_name": "Min Hönsgård",
                "hen_count": 0,
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc)
            })
            
            trial_expires = datetime.now(timezone.utc) + timedelta(days=FREE_TRIAL_DAYS)
            await db.subscriptions.insert_one({
                "user_id": user_id,
                "is_active": True,
                "plan": "trial",
                "expires_at": trial_expires,
                "created_at": datetime.now(timezone.utc)
            })
            logger.info(f"New Apple user created via mobile: {email}")
        
        session_token = f"session_{uuid.uuid4().hex}"
        expires_at = datetime.now(timezone.utc) + timedelta(days=7)
        
        await db.user_sessions.delete_many({"user_id": user_id})
        await db.user_sessions.insert_one({
            "user_id": user_id,
            "session_token": session_token,
            "expires_at": expires_at,
            "auth_provider": "apple",
            "platform": "mobile",
            "created_at": datetime.now(timezone.utc)
        })
        
        response.set_cookie(
            key="session_token",
            value=session_token,
            httponly=True,
            secure=True,
            samesite="none",
            path="/",
            max_age=7 * 24 * 60 * 60
        )
        
        return {
            "success": True,
            "user_id": user_id,
            "email": email,
            "name": name,
            "token": session_token
        }
        
    except Exception as e:
        logger.error(f"Apple mobile auth error: {e}")
        raise HTTPException(status_code=500, detail="Authentication failed")


# ============ EMAIL/PASSWORD AUTH ============
def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    """Verify a password against its hash"""
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

@api_router.post("/auth/register")
async def register_email(data: EmailRegister, request: Request, response: Response):
    """Start registration - sends verification code to email"""
    # Check if terms are accepted
    if not data.accepted_terms:
        raise HTTPException(status_code=400, detail="Du måste godkänna användarvillkoren")
    
    # Check if name is provided
    if not data.name or not data.name.strip():
        raise HTTPException(status_code=400, detail="Namn är obligatoriskt")
    
    # Check if email already exists
    existing = await db.users.find_one({"email": data.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="E-postadressen är redan registrerad")
    
    # Validate password
    if len(data.password) < 6:
        raise HTTPException(status_code=400, detail="Lösenordet måste vara minst 6 tecken")
    
    # Generate 6-digit verification code
    import random
    verification_code = ''.join([str(random.randint(0, 9)) for _ in range(6)])
    expires = datetime.now(timezone.utc) + timedelta(minutes=15)
    
    # Store pending registration
    hashed_pw = hash_password(data.password)
    await db.pending_registrations.delete_many({"email": data.email.lower()})
    
    await db.pending_registrations.insert_one({
        "email": data.email.lower(),
        "name": data.name.strip(),
        "password_hash": hashed_pw,
        "accepted_terms": True,
        "accepted_marketing": data.accepted_marketing,
        "referred_by": data.referral_code.upper() if data.referral_code else None,
        "verification_code": verification_code,
        "expires_at": expires.isoformat(),
        "attempts": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Send verification email
    email_sent = False
    if RESEND_API_KEY:
        try:
            resend.api_key = RESEND_API_KEY
            resend.Emails.send({
                "from": f"Hönsgården <{SENDER_EMAIL}>",
                "to": data.email.lower(),
                "subject": "Verifiera din e-postadress - Hönsgården 🐔",
                "html": f"""
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; text-align: center;">
                    <h2 style="color: #4ade80;">🐔 Hönsgården</h2>
                    <p>Hej {data.name.strip()}!</p>
                    <p>Välkommen till Hönsgården! Verifiera din e-postadress genom att ange denna kod:</p>
                    <div style="background: #f3f4f6; padding: 20px; border-radius: 12px; margin: 24px 0;">
                        <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1f2937;">{verification_code}</span>
                    </div>
                    <p style="color: #6b7280; font-size: 14px;">Koden är giltig i 15 minuter.</p>
                    <p style="margin-top: 24px;">Vänliga hälsningar,<br>Hönsgården</p>
                </div>
                """
            })
            email_sent = True
            logger.info(f"Verification code sent to {data.email}")
        except Exception as e:
            logger.error(f"Failed to send verification email: {e}")
    
    if email_sent:
        return {
            "message": "En verifieringskod har skickats till din e-postadress.",
            "email": data.email.lower(),
            "requires_verification": True
        }
    else:
        # If email fails, delete pending registration
        await db.pending_registrations.delete_many({"email": data.email.lower()})
        raise HTTPException(status_code=500, detail="Kunde inte skicka verifieringskod. Försök igen senare.")


@api_router.post("/auth/verify-registration")
async def verify_registration(data: dict, request: Request, response: Response):
    """Verify registration with 6-digit code and complete account creation"""
    email = data.get("email", "").lower()
    code = data.get("code", "")
    
    if not email or not code:
        raise HTTPException(status_code=400, detail="E-post och kod krävs")
    
    # Find pending registration
    pending = await db.pending_registrations.find_one({"email": email})
    if not pending:
        raise HTTPException(status_code=400, detail="Ingen väntande registrering hittades. Börja om från början.")
    
    # Check expiry
    expires_at = datetime.fromisoformat(pending["expires_at"].replace('Z', '+00:00'))
    if datetime.now(timezone.utc) > expires_at:
        await db.pending_registrations.delete_one({"email": email})
        raise HTTPException(status_code=400, detail="Koden har gått ut. Registrera dig igen.")
    
    # Check attempts
    if pending.get("attempts", 0) >= 5:
        await db.pending_registrations.delete_one({"email": email})
        raise HTTPException(status_code=400, detail="För många försök. Registrera dig igen.")
    
    # Verify code
    if pending["verification_code"] != code:
        await db.pending_registrations.update_one(
            {"email": email},
            {"$inc": {"attempts": 1}}
        )
        remaining = 5 - (pending.get("attempts", 0) + 1)
        raise HTTPException(status_code=400, detail=f"Felaktig kod. {remaining} försök kvar.")
    
    # Code is correct - create the user account
    user_id = str(uuid.uuid4())
    
    # Generate unique referral code for this user
    referral_code = secrets.token_urlsafe(6).upper()[:8]  # 8 character code
    
    # Check if user was referred by someone
    referred_by = pending.get("referred_by")
    
    user = {
        "id": user_id,
        "email": email,
        "password_hash": pending["password_hash"],
        "name": pending["name"],
        "picture": None,
        "auth_provider": "email",
        "email_verified": True,
        "accepted_terms": True,
        "accepted_terms_at": datetime.now(timezone.utc).isoformat(),
        "accepted_marketing": pending.get("accepted_marketing", False),
        "accepted_marketing_at": datetime.now(timezone.utc).isoformat() if pending.get("accepted_marketing") else None,
        "referral_code": referral_code,
        "referred_by": referred_by,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user)
    
    # Delete pending registration
    await db.pending_registrations.delete_one({"email": email})
    
    # Give 7 days FREE trial premium
    trial_end = datetime.now(timezone.utc) + timedelta(days=7)
    subscription = {
        "user_id": user_id,
        "plan": "trial",
        "is_active": True,
        "expires_at": trial_end.isoformat(),
        "trial_end": trial_end.isoformat(),
        "purchase_source": "trial",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.subscriptions.insert_one(subscription)
    
    # Handle referral bonus - give 7 extra days to BOTH users
    if referred_by:
        # Find the referrer
        referrer = await db.users.find_one({"referral_code": referred_by})
        if referrer:
            referrer_id = referrer["id"]
            
            # Record the referral
            await db.referrals.insert_one({
                "referrer_id": referrer_id,
                "referred_id": user_id,
                "referred_email": email,
                "bonus_days": 7,
                "created_at": datetime.now(timezone.utc).isoformat()
            })
            
            # Extend referrer's premium by 7 days
            referrer_sub = await db.subscriptions.find_one({"user_id": referrer_id})
            if referrer_sub:
                current_expires = referrer_sub.get("expires_at")
                if current_expires:
                    if isinstance(current_expires, str):
                        current_expires = datetime.fromisoformat(current_expires.replace('Z', '+00:00'))
                    new_expires = max(current_expires, datetime.now(timezone.utc)) + timedelta(days=7)
                else:
                    new_expires = datetime.now(timezone.utc) + timedelta(days=7)
                
                await db.subscriptions.update_one(
                    {"user_id": referrer_id},
                    {"$set": {
                        "expires_at": new_expires.isoformat(),
                        "is_active": True,
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
            else:
                # Create subscription for referrer if they don't have one
                await db.subscriptions.insert_one({
                    "user_id": referrer_id,
                    "plan": "referral_bonus",
                    "is_active": True,
                    "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
                    "purchase_source": "referral",
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                })
            
            logger.info(f"Referral bonus applied: {referrer['email']} referred {email}")
    
    # Create default coop
    coop = CoopSettings(user_id=user_id, coop_name="Min Hönsgård")
    await db.coops.insert_one(coop.dict())
    
    # Create session and set cookie
    session_token = str(uuid.uuid4())
    session = UserSession(
        user_id=user_id,
        session_token=session_token,
        expires_at=datetime.now(timezone.utc) + timedelta(days=7)
    )
    await db.user_sessions.insert_one(session.dict())
    
    # Set cookie
    host = request.headers.get("host", "")
    cookie_domain = host.split(":")[0] if "emergent.host" in host else None
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 60 * 60,
        domain=cookie_domain
    )
    
    logger.info(f"New user registered and verified: {email}")
    
    return {
        "user_id": user_id,
        "email": email,
        "name": pending["name"],
        "message": "Kontot skapat! Välkommen till Hönsgården!"
    }


@api_router.post("/auth/resend-verification")
async def resend_verification(data: dict):
    """Resend verification code for pending registration"""
    email = data.get("email", "").lower()
    
    if not email:
        raise HTTPException(status_code=400, detail="E-post krävs")
    
    # Find pending registration
    pending = await db.pending_registrations.find_one({"email": email})
    if not pending:
        raise HTTPException(status_code=400, detail="Ingen väntande registrering hittades.")
    
    # Generate new code
    import random
    new_code = ''.join([str(random.randint(0, 9)) for _ in range(6)])
    expires = datetime.now(timezone.utc) + timedelta(minutes=15)
    
    # Update pending registration
    await db.pending_registrations.update_one(
        {"email": email},
        {
            "$set": {
                "verification_code": new_code,
                "expires_at": expires.isoformat(),
                "attempts": 0
            }
        }
    )
    
    # Send email
    email_sent = False
    if RESEND_API_KEY:
        try:
            resend.api_key = RESEND_API_KEY
            resend.Emails.send({
                "from": f"Hönsgården <{SENDER_EMAIL}>",
                "to": email,
                "subject": "Ny verifieringskod - Hönsgården 🐔",
                "html": f"""
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; text-align: center;">
                    <h2 style="color: #4ade80;">🐔 Hönsgården</h2>
                    <p>Här är din nya verifieringskod:</p>
                    <div style="background: #f3f4f6; padding: 20px; border-radius: 12px; margin: 24px 0;">
                        <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1f2937;">{new_code}</span>
                    </div>
                    <p style="color: #6b7280; font-size: 14px;">Koden är giltig i 15 minuter.</p>
                </div>
                """
            })
            email_sent = True
            logger.info(f"New verification code sent to {email}")
        except Exception as e:
            logger.error(f"Failed to resend verification email: {e}")
    
    if email_sent:
        return {"message": "Ny verifieringskod har skickats.", "code_sent": True}
    else:
        raise HTTPException(status_code=500, detail="Kunde inte skicka verifieringskod.")


@api_router.post("/auth/login")
async def login_email(data: EmailLogin, request: Request, response: Response):
    """Login with email and password"""
    # Find user
    user = await db.users.find_one({"email": data.email.lower()})
    if not user:
        raise HTTPException(status_code=401, detail="Felaktig e-post eller lösenord")
    
    # Check if user has password (might be Google-only user)
    if not user.get("password_hash"):
        raise HTTPException(status_code=401, detail="Detta konto använder Google-inloggning. Logga in med Google istället.")
    
    # Verify password
    if not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Felaktig e-post eller lösenord")
    
    user_id = user["id"]
    
    # Create session and set cookie
    session_token = str(uuid.uuid4())
    session_ttl_days = 7  # Short-lived session
    session = UserSession(
        user_id=user_id,
        session_token=session_token,
        expires_at=datetime.now(timezone.utc) + timedelta(days=session_ttl_days)
    )
    await db.user_sessions.insert_one(session.dict())
    
    # Set cookie
    host = request.headers.get("host", "")
    cookie_domain = host.split(":")[0] if "emergent.host" in host else None
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=session_ttl_days * 24 * 60 * 60,
        domain=cookie_domain
    )
    
    # Handle "remember me" for web
    remember_token = None
    if data.remember_me:
        # Generate secure remember token
        remember_token_raw = secrets.token_urlsafe(32)
        remember_token_hash = hashlib.sha256(remember_token_raw.encode()).hexdigest()
        
        remember_ttl_days = 90  # Long-lived remember token
        
        # Store hashed token in DB
        await db.remember_tokens.insert_one({
            "user_id": user_id,
            "remember_hash": remember_token_hash,
            "created_at": datetime.now(timezone.utc),
            "expires_at": datetime.now(timezone.utc) + timedelta(days=remember_ttl_days),
            "rotated_at": None,
            "revoked_at": None,
            "device_label": request.headers.get("User-Agent", "")[:100]
        })
        
        # Set remember cookie
        response.set_cookie(
            key="remember_token",
            value=remember_token_raw,
            httponly=True,
            secure=True,
            samesite="lax",
            path="/",
            max_age=remember_ttl_days * 24 * 60 * 60,
            domain=cookie_domain
        )
        
        logger.debug(f"[Auth] Remember token created for user {user_id}")
    
    return {
        "user_id": user_id,
        "email": user["email"],
        "name": user.get("name", ""),
        "picture": user.get("picture"),
        "session_token": session_token  # Include token for native apps
    }

# ============ MAGIC LINK ENDPOINTS ============
# Rate limiting for magic links (in-memory, resets on restart)
magic_link_rate_limit: Dict[str, list] = defaultdict(list)
MAGIC_LINK_RATE_LIMIT_PER_MIN = 3
MAGIC_LINK_RATE_LIMIT_PER_HOUR = 10

def check_magic_link_rate_limit(user_id: str) -> bool:
    """Check if user has exceeded magic link rate limit"""
    now = time.time()
    requests = magic_link_rate_limit[user_id]
    
    # Clean old entries
    requests = [t for t in requests if now - t < 3600]  # Keep last hour
    magic_link_rate_limit[user_id] = requests
    
    # Check limits
    last_minute = sum(1 for t in requests if now - t < 60)
    last_hour = len(requests)
    
    if last_minute >= MAGIC_LINK_RATE_LIMIT_PER_MIN or last_hour >= MAGIC_LINK_RATE_LIMIT_PER_HOUR:
        return False
    return True

@api_router.post("/auth/magic-link")
async def create_magic_link(request: Request, data: MagicLinkRequest):
    """Create magic link for web login (from app)
    Requires authentication - user must be logged in to app"""
    user_id = await require_user_id(request)
    
    # Rate limiting
    if not check_magic_link_rate_limit(user_id):
        raise HTTPException(status_code=429, detail="För många förfrågningar. Vänta en stund.")
    
    # Record this request
    magic_link_rate_limit[user_id].append(time.time())
    
    # Get user email
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Användare hittades inte")
    
    # Generate secure token
    token_raw = secrets.token_urlsafe(32)  # 256 bits
    token_hash = hashlib.sha256(token_raw.encode()).hexdigest()
    
    # Validate next_url (only allow relative paths)
    next_url = data.next_url or "/"
    if not next_url.startswith("/") or "//" in next_url:
        next_url = "/"
    
    # Store in DB (only hash)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
    await db.magic_links.insert_one({
        "user_id": user_id,
        "token_hash": token_hash,
        "created_at": datetime.now(timezone.utc),
        "expires_at": expires_at,
        "used_at": None,
        "next_url": next_url,
        "request_ip": request.client.host if request.client else None,
        "user_agent": request.headers.get("User-Agent", "")[:200]
    })
    
    # Create TTL index if not exists (runs once)
    try:
        await db.magic_links.create_index("expires_at", expireAfterSeconds=0)
    except:
        pass  # Index might already exist
    
    # Build magic link URL
    app_url = os.environ.get("APP_URL", "https://honsgarden.se")
    magic_link_url = f"{app_url}/magic?token={token_raw}&next={next_url}"
    
    # Send email
    try:
        if RESEND_API_KEY:
            resend.api_key = RESEND_API_KEY
            resend.Emails.send({
                "from": f"Hönsgården <{SENDER_EMAIL}>",
                "to": user["email"],
                "subject": "Logga in på webben - Hönsgården",
                "html": f"""
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #92400e;">🐔 Hönsgården</h2>
                    <p>Hej {user.get('name', '').split()[0] or 'där'}!</p>
                    <p>Du har begärt att logga in på webben från appen. Klicka på länken nedan för att logga in:</p>
                    <p style="margin: 24px 0;">
                        <a href="{magic_link_url}" 
                           style="background: #92400e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
                            Logga in på webben
                        </a>
                    </p>
                    <p style="color: #666; font-size: 14px;">
                        Länken är giltig i 10 minuter och kan bara användas en gång.
                    </p>
                    <p style="color: #666; font-size: 12px; margin-top: 32px;">
                        Om du inte begärde detta kan du ignorera mailet.
                    </p>
                </div>
                """
            })
            logger.debug(f"[Magic Link] Email sent to {user['email']}, token ...{token_raw[-6:]}")
        else:
            logger.warning("[Magic Link] RESEND_API_KEY not configured, email not sent")
    except Exception as e:
        logger.error(f"[Magic Link] Failed to send email: {e}")
        # Don't fail the request, user can still use the link if they have access
    
    return {"ok": True, "message": "E-post skickad! Kolla din inkorg."}

@api_router.get("/auth/magic/consume")
async def consume_magic_link(token: str, next: str = "/", request: Request = None, response: Response = None):
    """Consume magic link and create web session
    Redirects to next URL on success, /login?magic=expired on failure"""
    
    # Validate next URL (only allow relative paths)
    if not next.startswith("/") or "//" in next:
        next = "/"
    
    # Hash the provided token
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    
    # Find and validate magic link
    magic_link = await db.magic_links.find_one({
        "token_hash": token_hash,
        "used_at": None,
        "expires_at": {"$gt": datetime.now(timezone.utc)}
    })
    
    if not magic_link:
        logger.debug(f"[Magic Link] Invalid or expired token ...{token[-6:]}")
        return RedirectResponse(url="/login?magic=expired", status_code=302)
    
    # Mark as used
    await db.magic_links.update_one(
        {"token_hash": token_hash},
        {"$set": {"used_at": datetime.now(timezone.utc)}}
    )
    
    user_id = magic_link["user_id"]
    
    # Create web session
    session_token = str(uuid.uuid4())
    session_ttl_days = 7
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=session_ttl_days),
        "created_via": "magic_link"
    })
    
    # Set cookie
    host = request.headers.get("host", "") if request else ""
    cookie_domain = host.split(":")[0] if "emergent.host" in host else None
    
    redirect_response = RedirectResponse(url=next, status_code=302)
    redirect_response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="lax",
        path="/",
        max_age=session_ttl_days * 24 * 60 * 60,
        domain=cookie_domain
    )
    
    logger.debug(f"[Magic Link] Consumed successfully for user {user_id}, redirecting to {next}")
    
    return redirect_response

# ============ REFERRAL ENDPOINTS ============
@api_router.get("/referral/info")
async def get_referral_info(request: Request):
    """Get user's referral code and stats"""
    user_id = await require_user_id(request)
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Användare hittades inte")
    
    # Generate referral code if user doesn't have one
    referral_code = user.get("referral_code")
    if not referral_code:
        referral_code = secrets.token_urlsafe(6).upper()[:8]
        await db.users.update_one(
            {"id": user_id},
            {"$set": {"referral_code": referral_code}}
        )
    
    # Count referrals
    referrals = await db.referrals.count_documents({"referrer_id": user_id})
    bonus_days = referrals * 7  # 7 days per referral
    
    # Build referral link
    app_url = os.environ.get("APP_URL", "https://honsgarden.se")
    referral_link = f"{app_url}/register?ref={referral_code}"
    
    return {
        "referral_code": referral_code,
        "referral_link": referral_link,
        "referrals_count": referrals,
        "bonus_days_earned": bonus_days
    }

@api_router.get("/referral/list")
async def get_referral_list(request: Request):
    """Get list of users referred by current user"""
    user_id = await require_user_id(request)
    
    referrals = await db.referrals.find(
        {"referrer_id": user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    # Get referred users' names
    for ref in referrals:
        referred_user = await db.users.find_one(
            {"id": ref.get("referred_id")},
            {"_id": 0, "name": 1}
        )
        ref["referred_name"] = referred_user.get("name", "Okänd") if referred_user else "Okänd"
    
    return {"referrals": referrals}

@api_router.post("/auth/forgot-password")
async def forgot_password(data: PasswordResetRequest):
    """Request password reset with 6-digit code (for mobile app)"""
    user = await db.users.find_one({"email": data.email.lower()})
    
    # Always return success (don't reveal if email exists)
    if not user:
        return {"message": "Om e-postadressen finns i systemet kommer du få en återställningskod.", "code_sent": False}
    
    # Check if user has password auth
    if not user.get("password_hash"):
        return {"message": "Om e-postadressen finns i systemet kommer du få en återställningskod.", "code_sent": False}
    
    # Generate 6-digit code
    import random
    reset_code = ''.join([str(random.randint(0, 9)) for _ in range(6)])
    expires = datetime.now(timezone.utc) + timedelta(minutes=15)  # 15 min expiry for code
    
    # Delete any existing codes for this user
    await db.password_resets.delete_many({"user_id": user["id"]})
    
    await db.password_resets.insert_one({
        "user_id": user["id"],
        "email": data.email.lower(),
        "code": reset_code,
        "expires_at": expires.isoformat(),
        "used": False,
        "attempts": 0
    })
    
    # Send email via Resend
    email_sent = False
    try:
        if not RESEND_API_KEY:
            logger.warning("RESEND_API_KEY not configured, skipping password reset email")
        else:
            resend.api_key = RESEND_API_KEY
            resend.Emails.send({
                "from": f"Hönsgården <{SENDER_EMAIL}>",
                "to": data.email,
                "subject": "Din återställningskod - Hönsgården",
                "html": f"""
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; text-align: center;">
                    <h2 style="color: #4ade80;">🐔 Hönsgården</h2>
                    <p>Hej!</p>
                    <p>Du har begärt att återställa ditt lösenord.</p>
                    <p>Ange denna kod i appen:</p>
                    <div style="background: #f3f4f6; padding: 20px; border-radius: 12px; margin: 24px 0;">
                        <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1f2937;">{reset_code}</span>
                    </div>
                    <p style="color: #6b7280; font-size: 14px;">Koden är giltig i 15 minuter.</p>
                    <p style="color: #6b7280; font-size: 14px;">Om du inte begärde denna återställning kan du ignorera detta mail.</p>
                    <p style="margin-top: 24px;">Vänliga hälsningar,<br>Hönsgården</p>
                </div>
                """
            })
            email_sent = True
            logger.info(f"Password reset code sent to {data.email}")
    except Exception as e:
        logger.error(f"Failed to send password reset email: {e}")
    
    if email_sent:
        return {"message": "En återställningskod har skickats till din e-postadress.", "code_sent": True}
    else:
        return {"message": "E-posttjänsten är inte tillgänglig. Kontakta support.", "code_sent": False}

@api_router.post("/auth/verify-reset-code")
async def verify_reset_code(data: dict):
    """Verify the 6-digit reset code"""
    email = data.get("email", "").lower()
    code = data.get("code", "")
    
    if not email or not code:
        raise HTTPException(status_code=400, detail="E-post och kod krävs")
    
    reset = await db.password_resets.find_one({
        "email": email,
        "used": False
    })
    
    if not reset:
        raise HTTPException(status_code=400, detail="Ingen aktiv återställning hittades")
    
    # Check expiry
    expires = datetime.fromisoformat(reset["expires_at"].replace('Z', '+00:00'))
    if datetime.now(timezone.utc) > expires:
        raise HTTPException(status_code=400, detail="Koden har gått ut. Begär en ny kod.")
    
    # Check attempts (max 5)
    if reset.get("attempts", 0) >= 5:
        raise HTTPException(status_code=400, detail="För många försök. Begär en ny kod.")
    
    # Increment attempts
    await db.password_resets.update_one(
        {"_id": reset["_id"]},
        {"$inc": {"attempts": 1}}
    )
    
    # Verify code
    if reset.get("code") != code:
        remaining = 5 - reset.get("attempts", 0) - 1
        raise HTTPException(status_code=400, detail=f"Felaktig kod. {remaining} försök kvar.")
    
    # Generate a temporary token for the password reset step
    temp_token = str(uuid.uuid4())
    await db.password_resets.update_one(
        {"_id": reset["_id"]},
        {"$set": {"verified_token": temp_token, "verified_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"success": True, "token": temp_token, "message": "Koden verifierad! Välj ett nytt lösenord."}

@api_router.post("/auth/reset-password-with-code")
async def reset_password_with_code(data: dict):
    """Reset password using verified token from code flow"""
    token = data.get("token", "")
    new_password = data.get("new_password", "")
    
    if not token or not new_password:
        raise HTTPException(status_code=400, detail="Token och nytt lösenord krävs")
    
    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="Lösenordet måste vara minst 6 tecken")
    
    reset = await db.password_resets.find_one({
        "verified_token": token,
        "used": False
    })
    
    if not reset:
        raise HTTPException(status_code=400, detail="Ogiltig eller utgången token")
    
    # Check verified_at (must be within 10 minutes)
    verified_at = datetime.fromisoformat(reset.get("verified_at", "2000-01-01T00:00:00+00:00").replace('Z', '+00:00'))
    if datetime.now(timezone.utc) > verified_at + timedelta(minutes=10):
        raise HTTPException(status_code=400, detail="Sessionen har gått ut. Börja om från början.")
    
    # Update password
    hashed_pw = hash_password(new_password)
    await db.users.update_one(
        {"id": reset["user_id"]},
        {"$set": {"password_hash": hashed_pw}}
    )
    
    # Mark as used
    await db.password_resets.update_one(
        {"_id": reset["_id"]},
        {"$set": {"used": True}}
    )
    
    logger.info(f"Password reset completed for user {reset['user_id']}")
    return {"success": True, "message": "Lösenordet har ändrats! Du kan nu logga in."}

@api_router.post("/auth/reset-password")
async def reset_password(data: PasswordReset, request: Request, response: Response):
    """Reset password with token"""
    # Find valid reset token
    reset = await db.password_resets.find_one({
        "token": data.token,
        "used": False
    })
    
    if not reset:
        raise HTTPException(status_code=400, detail="Ogiltig eller utgången återställningslänk")
    
    # Check expiry
    expires = datetime.fromisoformat(reset["expires_at"].replace('Z', '+00:00'))
    if datetime.now(timezone.utc) > expires:
        raise HTTPException(status_code=400, detail="Återställningslänken har gått ut")
    
    # Validate new password
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="Lösenordet måste vara minst 6 tecken")
    
    # Update password
    hashed_pw = hash_password(data.new_password)
    await db.users.update_one(
        {"id": reset["user_id"]},
        {"$set": {"password_hash": hashed_pw}}
    )
    
    # Mark token as used
    await db.password_resets.update_one(
        {"token": data.token},
        {"$set": {"used": True}}
    )
    
    # Create session and log user in
    user = await db.users.find_one({"id": reset["user_id"]})
    session_token = str(uuid.uuid4())
    session = UserSession(
        user_id=user["id"],
        session_token=session_token,
        expires_at=datetime.now(timezone.utc) + timedelta(days=7)
    )
    await db.user_sessions.insert_one(session.dict())
    
    # Set cookie
    host = request.headers.get("host", "")
    cookie_domain = host.split(":")[0] if "emergent.host" in host else None
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 60 * 60,
        domain=cookie_domain
    )
    
    return {
        "user_id": user["id"],
        "email": user["email"],
        "message": "Lösenordet har återställts"
    }


# ============ STRIPE CHECKOUT ENDPOINTS ============
@api_router.post("/checkout/create", response_model=CreateCheckoutResponse)
async def create_checkout_session(req: CreateCheckoutRequest, request: Request):
    """Create Stripe checkout session for subscription"""
    user = await require_user(request)
    
    # Get price ID based on plan
    if req.plan == "monthly":
        price_id = STRIPE_PRICE_MONTHLY
    elif req.plan == "yearly":
        price_id = STRIPE_PRICE_YEARLY
    else:
        raise HTTPException(status_code=400, detail="Invalid plan. Use 'monthly' or 'yearly'")
    
    if not price_id:
        raise HTTPException(status_code=500, detail="Stripe price not configured")
    
    # Build URLs
    success_url = f"{req.origin_url}/api/checkout-success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{req.origin_url}/api/premium-page"
    
    try:
        # Use Stripe SDK directly with mode="subscription" for recurring prices
        # The emergentintegrations library has mode="payment" hardcoded, which doesn't work for subscriptions
        stripe.api_key = STRIPE_API_KEY
        
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price': price_id,
                'quantity': 1,
            }],
            mode='subscription',  # Required for recurring prices
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                "user_id": user.user_id,
                "plan": req.plan
            }
        )
        
        # Store pending transaction
        await db.payment_transactions.insert_one({
            "id": str(uuid.uuid4()),
            "session_id": session.id,
            "user_id": user.user_id,
            "plan": req.plan,
            "amount": 19.0 if req.plan == "monthly" else 149.0,
            "currency": "SEK",
            "payment_status": "pending",
            "created_at": datetime.now(timezone.utc)
        })
        
        return CreateCheckoutResponse(url=session.url, session_id=session.id)
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error creating checkout session: {e}")
        raise HTTPException(status_code=500, detail=f"Betalningsfel: {str(e)}")
    except Exception as e:
        logger.error(f"Error creating checkout session: {e}")
        raise HTTPException(status_code=500, detail="Kunde inte skapa betalningssession")

@api_router.get("/checkout/status/{session_id}")
async def get_checkout_status(session_id: str, request: Request):
    """Get checkout session status"""
    user = await require_user(request)
    
    host_url = str(request.base_url).rstrip('/')
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    status = await stripe_checkout.get_checkout_status(session_id)
    
    # Update transaction status
    if status.payment_status == "paid":
        # Find the transaction
        transaction = await db.payment_transactions.find_one({"session_id": session_id})
        if transaction and transaction.get("payment_status") != "paid":
            # Update transaction
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {"$set": {"payment_status": "paid", "updated_at": datetime.now(timezone.utc)}}
            )
            
            # Activate premium for user
            plan = transaction.get("plan", "monthly")
            if plan == "yearly":
                expires_at = datetime.now(timezone.utc) + timedelta(days=365)
            else:
                expires_at = datetime.now(timezone.utc) + timedelta(days=30)
            
            await db.subscriptions.update_one(
                {"user_id": user.user_id},
                {"$set": {
                    "is_active": True,
                    "plan": plan,
                    "expires_at": expires_at,
                    "stripe_session_id": session_id,
                    "updated_at": datetime.now(timezone.utc)
                }},
                upsert=True
            )
    
    return {
        "status": status.status,
        "payment_status": status.payment_status,
        "amount_total": status.amount_total,
        "currency": status.currency
    }

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhooks"""
    body = await request.body()
    signature = request.headers.get("Stripe-Signature")
    
    host_url = str(request.base_url).rstrip('/')
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    try:
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        logger.info(f"Webhook received: {webhook_response.event_type}")
        
        if webhook_response.payment_status == "paid":
            user_id = webhook_response.metadata.get("user_id")
            plan = webhook_response.metadata.get("plan", "monthly")
            
            if user_id:
                if plan == "yearly":
                    expires_at = datetime.now(timezone.utc) + timedelta(days=365)
                else:
                    expires_at = datetime.now(timezone.utc) + timedelta(days=30)
                
                await db.subscriptions.update_one(
                    {"user_id": user_id},
                    {"$set": {
                        "is_active": True,
                        "plan": plan,
                        "expires_at": expires_at,
                        "stripe_session_id": webhook_response.session_id,
                        "updated_at": datetime.now(timezone.utc)
                    }},
                    upsert=True
                )
                
                # Update payment transaction
                await db.payment_transactions.update_one(
                    {"session_id": webhook_response.session_id},
                    {"$set": {"payment_status": "paid", "updated_at": datetime.now(timezone.utc)}}
                )
        
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return {"status": "error", "message": str(e)}

# ============ PREMIUM STATUS ENDPOINT ============
@api_router.get("/premium/status")
async def get_premium_status(request: Request):
    """Get premium subscription status for current user
    Works across both Stripe (web) and RevenueCat (app) purchases"""
    user = await get_current_user(request)
    
    if not user:
        # Not logged in - return not premium (no default_user fallback)
        return {
            "is_premium": False,
            "subscription_id": None,
            "plan": None,
            "expires_at": None,
            "stripe_customer_id": None,
            "source": None,
            "last_verified_at": None,
            "is_trial": False,
            "days_remaining": None,
            "trial_expiry_warning": None
        }
    
    subscription = await db.subscriptions.find_one({"user_id": user.user_id}, {"_id": 0})
    
    if not subscription:
        return {
            "is_premium": False,
            "subscription_id": None,
            "plan": None,
            "expires_at": None,
            "stripe_customer_id": None,
            "source": None,
            "last_verified_at": None,
            "is_trial": False,
            "days_remaining": None,
            "trial_expiry_warning": None
        }
    
    is_active = subscription.get('is_active', False)
    expires_at = subscription.get('expires_at')
    is_trial = subscription.get('plan') == 'trial'
    days_remaining = None
    trial_expiry_warning = None
    
    if expires_at:
        if isinstance(expires_at, str):
            expires_at = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        
        now = datetime.now(timezone.utc)
        if expires_at < now:
            is_active = False
            await db.subscriptions.update_one(
                {"user_id": subscription.get("user_id")},
                {"$set": {"is_active": False}}
            )
        else:
            # Calculate days remaining
            delta = expires_at - now
            days_remaining = max(0, delta.days)
            
            # Generate trial expiry warning for trials with 3 or fewer days left
            if is_trial and days_remaining <= 3:
                if days_remaining == 0:
                    trial_expiry_warning = "last_day"
                elif days_remaining == 1:
                    trial_expiry_warning = "one_day"
                elif days_remaining == 2:
                    trial_expiry_warning = "two_days"
                elif days_remaining == 3:
                    trial_expiry_warning = "three_days"
    
    # Determine source from purchase_source field
    purchase_source = subscription.get('purchase_source', '')
    if 'stripe' in purchase_source:
        source = 'stripe'
    elif 'revenuecat' in purchase_source or 'iap' in purchase_source:
        source = 'revenuecat'
    else:
        source = purchase_source or None
    
    return {
        "is_premium": is_active,
        "subscription_id": subscription.get('stripe_session_id') or subscription.get('stripe_subscription_id'),
        "plan": subscription.get('plan'),
        "expires_at": expires_at.isoformat() if expires_at else None,
        "stripe_customer_id": subscription.get('stripe_customer_id'),
        "source": source,
        "last_verified_at": subscription.get('updated_at').isoformat() if subscription.get('updated_at') else None,
        "is_trial": is_trial,
        "days_remaining": days_remaining,
        "trial_expiry_warning": trial_expiry_warning
    }

# ============ CANCEL SUBSCRIPTION ENDPOINT ============
@api_router.post("/subscription/cancel")
async def cancel_subscription(request: Request, cancel_req: CancelSubscriptionRequest):
    """Cancel user's subscription"""
    user = await require_user(request)
    
    subscription = await db.subscriptions.find_one({"user_id": user.user_id})
    if not subscription or not subscription.get('is_active'):
        raise HTTPException(status_code=400, detail="Ingen aktiv prenumeration hittades")
    
    # Store cancellation info
    await db.subscriptions.update_one(
        {"user_id": user.user_id},
        {"$set": {
            "is_active": False,
            "cancelled_at": datetime.now(timezone.utc),
            "cancellation_reason": cancel_req.reason,
            "updated_at": datetime.now(timezone.utc)
        }}
    )
    
    # Log cancellation
    await db.cancellations.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user.user_id,
        "email": user.email,
        "plan": subscription.get('plan'),
        "reason": cancel_req.reason,
        "cancelled_at": datetime.now(timezone.utc)
    })
    
    logger.info(f"Subscription cancelled for user {user.email}")
    
    return {
        "message": "Prenumerationen har avslutats",
        "expires_at": subscription.get('expires_at')
    }

# ============ IN-APP PURCHASE (IAP) VERIFICATION ============
class IAPVerifyRequest(BaseModel):
    platform: str  # 'ios' or 'android'
    receipt_data: str  # iOS: receipt-data, Android: purchase token
    product_id: str
    transaction_id: Optional[str] = None

class IAPRestoreRequest(BaseModel):
    platform: str
    receipt_data: Optional[str] = None

@api_router.post("/iap/verify")
async def verify_iap_purchase(request: Request, iap_data: IAPVerifyRequest):
    """
    Verify in-app purchase via RevenueCat API.
    This endpoint validates purchases by checking entitlements with RevenueCat server-side.
    
    The receipt_data should contain the RevenueCat app_user_id (which should match user_id).
    """
    user = await require_user(request)
    
    try:
        # Get RevenueCat API key from environment
        REVENUECAT_API_KEY = os.environ.get('REVENUECAT_API_KEY', '')
        
        if not REVENUECAT_API_KEY:
            logger.warning("REVENUECAT_API_KEY not set - cannot verify IAP server-side")
            # Fallback: Trust client-side verification but log warning
            # In production, this should fail or use webhooks
            return await _fallback_iap_verify(user, iap_data)
        
        # RevenueCat uses app_user_id to identify subscribers
        # The client should have called identifyUser(user_id) which sets this
        app_user_id = user.user_id
        
        # Call RevenueCat API to get subscriber info
        revenuecat_url = f"https://api.revenuecat.com/v1/subscribers/{app_user_id}"
        headers = {
            "Authorization": f"Bearer {REVENUECAT_API_KEY}",
            "Content-Type": "application/json"
        }
        
        import httpx
        async with httpx.AsyncClient() as client:
            response = await client.get(revenuecat_url, headers=headers)
        
        if response.status_code != 200:
            logger.error(f"RevenueCat API error: {response.status_code} - {response.text}")
            return {"success": False, "error": "Could not verify subscription with RevenueCat"}
        
        subscriber_data = response.json()
        subscriber = subscriber_data.get("subscriber", {})
        entitlements = subscriber.get("entitlements", {})
        
        # Check if user has active premium entitlement
        # The entitlement ID should match what's configured in RevenueCat dashboard
        premium_entitlement = entitlements.get("Hönsgården app Pro") or entitlements.get("premium") or entitlements.get("pro")
        
        is_valid = False
        plan = "monthly"
        expires_at = None
        
        if premium_entitlement and premium_entitlement.get("expires_date"):
            expires_date_str = premium_entitlement.get("expires_date")
            expires_at = datetime.fromisoformat(expires_date_str.replace("Z", "+00:00"))
            
            # Check if subscription is still active
            if expires_at > datetime.now(timezone.utc):
                is_valid = True
                
                # Determine plan from product identifier
                product_id = premium_entitlement.get("product_identifier", "")
                if "yearly" in product_id.lower() or "annual" in product_id.lower():
                    plan = "yearly"
        
        if is_valid:
            # Update user's subscription status
            await db.subscriptions.update_one(
                {"user_id": user.user_id},
                {"$set": {
                    "is_active": True,
                    "plan": plan,
                    "expires_at": expires_at,
                    "platform": iap_data.platform,
                    "product_id": iap_data.product_id,
                    "transaction_id": iap_data.transaction_id,
                    "purchase_source": "iap_revenuecat",
                    "verified_via": "revenuecat_api",
                    "updated_at": datetime.now(timezone.utc)
                }},
                upsert=True
            )
            
            # Log the verified purchase
            await db.iap_transactions.insert_one({
                "id": str(uuid.uuid4()),
                "user_id": user.user_id,
                "email": user.email,
                "platform": iap_data.platform,
                "product_id": iap_data.product_id,
                "transaction_id": iap_data.transaction_id,
                "plan": plan,
                "verified": True,
                "verified_via": "revenuecat_api",
                "created_at": datetime.now(timezone.utc)
            })
            
            logger.info(f"IAP verified via RevenueCat for user {user.email}, plan: {plan}")
            
            return {
                "success": True,
                "is_premium": True,
                "plan": plan,
                "expires_at": expires_at.isoformat() if expires_at else None
            }
        else:
            logger.warning(f"IAP verification failed for user {user.email} - no active entitlement")
            return {
                "success": False,
                "error": "No active subscription found",
                "is_premium": False
            }
            
    except Exception as e:
        logger.error(f"IAP verification error: {e}")
        return {"success": False, "error": str(e)}


async def _fallback_iap_verify(user, iap_data: IAPVerifyRequest):
    """
    Fallback IAP verification when RevenueCat API key is not available.
    WARNING: This is NOT secure and should only be used in development.
    In production, always use RevenueCat API or webhooks.
    """
    logger.warning(f"Using FALLBACK IAP verification for user {user.email} - NOT SECURE FOR PRODUCTION")
    
    plan = "monthly"
    if "yearly" in iap_data.product_id.lower() or "annual" in iap_data.product_id.lower():
        plan = "yearly"
        expires_at = datetime.now(timezone.utc) + timedelta(days=365)
    else:
        expires_at = datetime.now(timezone.utc) + timedelta(days=30)
    
    # Only proceed if receipt_data exists
    if not iap_data.receipt_data:
        return {"success": False, "error": "No receipt data provided"}
    
    # Update subscription (INSECURE - trusting client)
    await db.subscriptions.update_one(
        {"user_id": user.user_id},
        {"$set": {
            "is_active": True,
            "plan": plan,
            "expires_at": expires_at,
            "platform": iap_data.platform,
            "product_id": iap_data.product_id,
            "purchase_source": "iap_fallback_INSECURE",
            "updated_at": datetime.now(timezone.utc)
        }},
        upsert=True
    )
    
    return {
        "success": True,
        "is_premium": True,
        "plan": plan,
        "expires_at": expires_at.isoformat(),
        "warning": "Verified via fallback - not secure for production"
    }

@api_router.post("/iap/restore")
async def restore_iap_purchases(request: Request, restore_data: IAPRestoreRequest):
    """
    Restore previous in-app purchases
    Called when user taps "Restore Purchases" in the app
    """
    user = await require_user(request)
    
    try:
        # Check if user has any previous IAP purchases
        subscription = await db.subscriptions.find_one({
            "user_id": user.user_id,
            "purchase_source": "iap"
        })
        
        if subscription:
            expires_at = subscription.get('expires_at')
            if expires_at:
                if isinstance(expires_at, str):
                    expires_at = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
                if expires_at.tzinfo is None:
                    expires_at = expires_at.replace(tzinfo=timezone.utc)
                
                # Check if still valid
                if expires_at > datetime.now(timezone.utc):
                    # Reactivate subscription
                    await db.subscriptions.update_one(
                        {"user_id": user.user_id},
                        {"$set": {"is_active": True, "updated_at": datetime.now(timezone.utc)}}
                    )
                    
                    return {
                        "success": True,
                        "is_premium": True,
                        "plan": subscription.get('plan'),
                        "expires_at": expires_at.isoformat(),
                        "message": "Köp återställda"
                    }
        
        # Also check for Stripe purchases (cross-platform premium)
        stripe_sub = await db.subscriptions.find_one({
            "user_id": user.user_id,
            "purchase_source": {"$ne": "iap"}
        })
        
        if stripe_sub and stripe_sub.get('is_active'):
            expires_at = stripe_sub.get('expires_at')
            if expires_at:
                if isinstance(expires_at, str):
                    expires_at = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
                if expires_at and expires_at > datetime.now(timezone.utc):
                    return {
                        "success": True,
                        "is_premium": True,
                        "plan": stripe_sub.get('plan'),
                        "expires_at": expires_at.isoformat() if expires_at else None,
                        "message": "Premium aktiv via webbköp"
                    }
        
        return {
            "success": False,
            "is_premium": False,
            "message": "Inga tidigare köp hittades"
        }
        
    except Exception as e:
        logger.error(f"IAP restore error: {e}")
        raise HTTPException(status_code=500, detail="Fel vid återställning av köp")

# ============ FEEDBACK ENDPOINTS ============
@api_router.post("/feedback")
async def submit_feedback(feedback: FeedbackCreate, request: Request):
    """Submit user feedback/tips"""
    user = await get_current_user(request)
    
    new_feedback = Feedback(
        user_id=user.user_id if user else None,
        type=feedback.type,
        message=feedback.message,
        email=feedback.email or (user.email if user else None)
    )
    
    await db.feedback.insert_one(new_feedback.dict())
    
    # Optionally send email notification to admin
    if RESEND_API_KEY:
        try:
            admin_email = "onboarding@resend.dev"  # Change to actual admin email
            email_html = f"""
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #1a1a2e;">🐔 Nytt tips från Hönsgården</h2>
                <p><strong>Typ:</strong> {feedback.type}</p>
                <p><strong>Från:</strong> {feedback.email or 'Anonym'}</p>
                <p><strong>Meddelande:</strong></p>
                <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin-top: 8px;">
                    {feedback.message}
                </div>
                <p style="color: #888; font-size: 12px; margin-top: 20px;">
                    Skickat: {datetime.now().strftime('%Y-%m-%d %H:%M')}
                </p>
            </div>
            """
            await asyncio.to_thread(resend.Emails.send, {
                "from": SENDER_EMAIL,
                "to": [admin_email],
                "subject": f"🐔 Nytt tips: {feedback.type}",
                "html": email_html
            })
        except Exception as e:
            logger.error(f"Failed to send feedback notification: {e}")
    
    logger.info(f"Feedback received: {feedback.type}")
    
    return {"message": "Tack för ditt tips! Vi uppskattar din feedback."}

@api_router.get("/feedback")
async def get_all_feedback(request: Request, limit: int = 50):
    """Get all feedback (admin only - for future use)"""
    user = await require_user(request)
    
    # Simple admin check (expand this later)
    feedback_list = await db.feedback.find().sort("created_at", -1).to_list(limit)
    return [{"id": f.get("id"), "type": f.get("type"), "message": f.get("message"), 
             "email": f.get("email"), "status": f.get("status"), 
             "created_at": f.get("created_at")} for f in feedback_list]

# ============ USER DATA HELPER ============
async def get_user_id(request: Request) -> str:
    """Get user_id from session - returns None if not authenticated"""
    user = await get_current_user(request)
    return user.user_id if user else None

async def require_user_id(request: Request) -> str:
    """Get user_id from session - raises 401 if not authenticated"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Inloggning krävs")
    return user.user_id

# ============ COOP SETTINGS ENDPOINTS ============
@api_router.get("/coop", response_model=CoopSettings)
async def get_coop_settings(request: Request):
    """Get or create coop settings"""
    user_id = await require_user_id(request)
    settings = await db.coop_settings.find_one({"user_id": user_id})
    if not settings:
        new_settings = CoopSettings(user_id=user_id)
        await db.coop_settings.insert_one(new_settings.dict())
        return new_settings
    return CoopSettings(**settings)

@api_router.put("/coop", response_model=CoopSettings)
async def update_coop_settings(update: CoopSettingsUpdate, request: Request):
    """Update coop settings"""
    user_id = await require_user_id(request)
    settings = await db.coop_settings.find_one({"user_id": user_id})
    if not settings:
        settings = CoopSettings(user_id=user_id).dict()
        await db.coop_settings.insert_one(settings)
    
    update_data = {k: v for k, v in update.dict().items() if v is not None}
    update_data['updated_at'] = datetime.utcnow()
    
    await db.coop_settings.update_one(
        {"user_id": user_id},
        {"$set": update_data}
    )
    
    updated = await db.coop_settings.find_one({"user_id": user_id})
    return CoopSettings(**updated)

# ============ FEATURE PREFERENCES ENDPOINTS ============
@api_router.get("/feature-preferences")
async def get_feature_preferences(request: Request):
    """Get user's feature preferences (Premium feature)"""
    user_id = await require_user_id(request)
    
    # Check premium status
    subscription = await db.subscriptions.find_one({"user_id": user_id})
    is_premium = subscription.get('is_active', False) if subscription else False
    
    prefs = await db.feature_preferences.find_one({"user_id": user_id})
    
    if not prefs:
        # Return defaults
        default_prefs = FeaturePreferences(user_id=user_id)
        return {
            "is_premium": is_premium,
            "can_customize": is_premium,
            "preferences": default_prefs.dict()
        }
    
    return {
        "is_premium": is_premium,
        "can_customize": is_premium,
        "preferences": {
            "show_flock_management": prefs.get("show_flock_management", True),
            "show_health_log": prefs.get("show_health_log", True),
            "show_feed_management": prefs.get("show_feed_management", True),
            "show_weather_data": prefs.get("show_weather_data", True),
            "show_hatching_module": prefs.get("show_hatching_module", True),
            "show_productivity_alerts": prefs.get("show_productivity_alerts", True),
            "show_economy_insights": prefs.get("show_economy_insights", True),
        }
    }

@api_router.put("/feature-preferences")
async def update_feature_preferences(update: FeaturePreferencesUpdate, request: Request):
    """Update user's feature preferences (Premium only)"""
    user_id = await require_user_id(request)
    
    # Check premium status
    subscription = await db.subscriptions.find_one({"user_id": user_id})
    is_premium = subscription.get('is_active', False) if subscription else False
    
    if not is_premium:
        raise HTTPException(status_code=403, detail="Premium krävs för att anpassa funktioner")
    
    prefs = await db.feature_preferences.find_one({"user_id": user_id})
    
    if not prefs:
        # Create new preferences
        new_prefs = FeaturePreferences(user_id=user_id, **update.dict(exclude_none=True))
        await db.feature_preferences.insert_one(new_prefs.dict())
        prefs = new_prefs.dict()
    else:
        # Update existing
        update_data = {k: v for k, v in update.dict().items() if v is not None}
        update_data['updated_at'] = datetime.now(timezone.utc)
        
        await db.feature_preferences.update_one(
            {"user_id": user_id},
            {"$set": update_data}
        )
        prefs = await db.feature_preferences.find_one({"user_id": user_id})
    
    return {
        "is_premium": True,
        "can_customize": True,
        "preferences": {
            "show_flock_management": prefs.get("show_flock_management", True),
            "show_health_log": prefs.get("show_health_log", True),
            "show_feed_management": prefs.get("show_feed_management", True),
            "show_weather_data": prefs.get("show_weather_data", True),
            "show_hatching_module": prefs.get("show_hatching_module", True),
            "show_productivity_alerts": prefs.get("show_productivity_alerts", True),
            "show_economy_insights": prefs.get("show_economy_insights", True),
        },
        "message": "Inställningar sparade!"
    }

# ============ FLOCK ENDPOINTS ============
@api_router.post("/flocks", response_model=Flock)
async def create_flock(flock: FlockCreate, request: Request):
    """Create a new flock (Premium: unlimited, Free: max 1)"""
    user_id = await require_user_id(request)
    
    # Check premium status for flock limits
    subscription = await db.subscriptions.find_one({"user_id": user_id})
    is_premium = subscription.get('is_active', False) if subscription else False
    
    existing_flocks = await db.flocks.count_documents({"user_id": user_id})
    if not is_premium and existing_flocks >= 1:
        raise HTTPException(status_code=403, detail="Gratis-konto tillåter endast 1 flock. Uppgradera till Premium för obegränsat antal.")
    
    new_flock = Flock(user_id=user_id, **flock.dict())
    await db.flocks.insert_one(new_flock.dict())
    return new_flock

@api_router.get("/flocks")
async def get_flocks(request: Request):
    """Get all flocks for the user"""
    user_id = await require_user_id(request)
    flocks = await db.flocks.find({"user_id": user_id}, {"_id": 0}).sort("name", 1).to_list(50)
    return flocks

@api_router.get("/flocks/{flock_id}")
async def get_flock(flock_id: str, request: Request):
    """Get a specific flock with its hens"""
    user_id = await require_user_id(request)
    flock = await db.flocks.find_one({"id": flock_id, "user_id": user_id}, {"_id": 0})
    if not flock:
        raise HTTPException(status_code=404, detail="Flock not found")
    
    # Get hens in this flock
    hens = await db.hens.find({"user_id": user_id, "flock_id": flock_id, "is_active": True}, {"_id": 0}).to_list(100)
    flock["hens"] = hens
    flock["hen_count"] = len(hens)
    
    return flock

@api_router.put("/flocks/{flock_id}")
async def update_flock(flock_id: str, flock: FlockCreate, request: Request):
    """Update a flock"""
    user_id = await require_user_id(request)
    result = await db.flocks.update_one(
        {"id": flock_id, "user_id": user_id},
        {"$set": {"name": flock.name, "description": flock.description}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Flock not found")
    return {"message": "Flock uppdaterad"}

@api_router.delete("/flocks/{flock_id}")
async def delete_flock(flock_id: str, request: Request):
    """Delete a flock (moves hens to no flock)"""
    user_id = await require_user_id(request)
    
    # Remove flock_id from all hens in this flock
    await db.hens.update_many(
        {"user_id": user_id, "flock_id": flock_id},
        {"$set": {"flock_id": None}}
    )
    
    result = await db.flocks.delete_one({"id": flock_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Flock not found")
    return {"message": "Flock borttagen"}

# ============ HEN ENDPOINTS ============
@api_router.get("/hens/productivity-alerts")
async def get_productivity_alerts(request: Request):
    """Get hens with productivity issues (14+ days without eggs).
    Only shows alerts if user actively uses per-hen egg tracking.
    """
    user_id = await require_user_id(request)
    today = date.today()
    
    # First check: Does the user use per-hen egg tracking at all?
    # Count eggs with hen_id in the last 90 days
    ninety_days_ago = (today - timedelta(days=90)).isoformat()
    eggs_with_hen = await db.egg_records.count_documents({
        "user_id": user_id,
        "date": {"$gte": ninety_days_ago},
        "hen_id": {"$exists": True, "$ne": None}
    })
    
    total_eggs = await db.egg_records.count_documents({
        "user_id": user_id,
        "date": {"$gte": ninety_days_ago}
    })
    
    # If user doesn't use per-hen tracking (less than 10% of eggs linked to hens), don't show alerts
    uses_per_hen_tracking = eggs_with_hen > 0 and (eggs_with_hen / max(total_eggs, 1)) >= 0.1
    
    if not uses_per_hen_tracking:
        return {
            "total_alerts": 0,
            "hens_with_issues": [],
            "threshold_days": 14,
            "tracking_enabled": False,
            "message": "Produktivitetsvarningar visas när du registrerar ägg per höna"
        }
    
    # Get all active hens
    hens = await db.hens.find(
        {"user_id": user_id, "is_active": True, "status": "active"},
        {"_id": 0, "id": 1, "name": 1, "breed": 1, "flock_id": 1}
    ).to_list(100)
    
    # Get all eggs for last 30 days
    thirty_days_ago = (today - timedelta(days=30)).isoformat()
    eggs = await db.egg_records.find(
        {"user_id": user_id, "date": {"$gte": thirty_days_ago}},
        {"_id": 0, "hen_id": 1, "date": 1, "count": 1}
    ).to_list(10000)
    
    # Calculate last egg date per hen
    last_egg_by_hen = {}
    for egg in eggs:
        hen_id = egg.get('hen_id')
        if hen_id:
            egg_date = egg.get('date', '')
            if hen_id not in last_egg_by_hen or egg_date > last_egg_by_hen[hen_id]:
                last_egg_by_hen[hen_id] = egg_date
    
    # Only check hens that have at least one egg registered (active tracking)
    # This avoids false positives for newly added hens
    tracked_hen_ids = set(last_egg_by_hen.keys())
    
    # Find hens with 14+ days without eggs (only among tracked hens)
    alerts = []
    fourteen_days_ago = (today - timedelta(days=14)).isoformat()
    
    for hen in hens:
        hen_id = hen['id']
        
        # Only alert for hens that have been tracked before
        if hen_id not in tracked_hen_ids:
            continue
            
        last_egg = last_egg_by_hen.get(hen_id)
        
        if last_egg and last_egg < fourteen_days_ago:
            last_date = datetime.strptime(last_egg, '%Y-%m-%d').date()
            days_since = (today - last_date).days
            
            alerts.append({
                "hen_id": hen_id,
                "hen_name": hen['name'],
                "breed": hen.get('breed'),
                "flock_id": hen.get('flock_id'),
                "last_egg_date": last_egg,
                "days_since_egg": days_since,
                "alert_level": "high" if days_since >= 21 else "medium"
            })
    
    # Sort by days since egg (most concerning first)
    alerts.sort(key=lambda x: x['days_since_egg'], reverse=True)
    
    return {
        "total_alerts": len(alerts),
        "hens_with_issues": alerts,
        "threshold_days": 14,
        "tracking_enabled": True
    }

@api_router.post("/hens", response_model=Hen)
async def create_hen(hen: HenCreate, request: Request):
    """Create a new hen profile"""
    user_id = await require_user_id(request)
    new_hen = Hen(user_id=user_id, **hen.dict())
    await db.hens.insert_one(new_hen.dict())
    
    active_hens = await db.hens.count_documents({"user_id": user_id, "is_active": True})
    await db.coop_settings.update_one({"user_id": user_id}, {"$set": {"hen_count": active_hens}}, upsert=True)
    
    return new_hen

@api_router.get("/hens", response_model=List[Hen])
async def get_hens(request: Request, active_only: bool = True):
    """Get all hens"""
    user_id = await require_user_id(request)
    query = {"user_id": user_id}
    if active_only:
        query["is_active"] = True
    hens = await db.hens.find(query).sort("name", 1).to_list(100)
    return [Hen(**h) for h in hens]

@api_router.get("/hens/{hen_id}", response_model=Hen)
async def get_hen(hen_id: str, request: Request):
    """Get a specific hen"""
    user_id = await require_user_id(request)
    hen = await db.hens.find_one({"id": hen_id, "user_id": user_id})
    if not hen:
        raise HTTPException(status_code=404, detail="Hen not found")
    return Hen(**hen)

@api_router.put("/hens/{hen_id}", response_model=Hen)
async def update_hen(hen_id: str, update: HenUpdate, request: Request):
    """Update a hen's profile"""
    user_id = await require_user_id(request)
    update_data = {k: v for k, v in update.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    update_data['updated_at'] = datetime.utcnow()
    
    result = await db.hens.update_one(
        {"id": hen_id, "user_id": user_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Hen not found")
    
    if 'is_active' in update_data:
        active_hens = await db.hens.count_documents({"user_id": user_id, "is_active": True})
        await db.coop_settings.update_one({"user_id": user_id}, {"$set": {"hen_count": active_hens}})
    
    hen = await db.hens.find_one({"id": hen_id})
    return Hen(**hen)

@api_router.delete("/hens/{hen_id}")
async def delete_hen(hen_id: str, request: Request):
    """Delete a hen (soft delete)"""
    user_id = await require_user_id(request)
    result = await db.hens.update_one(
        {"id": hen_id, "user_id": user_id},
        {"$set": {"is_active": False, "updated_at": datetime.utcnow()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Hen not found")
    
    active_hens = await db.hens.count_documents({"user_id": user_id, "is_active": True})
    await db.coop_settings.update_one({"user_id": user_id}, {"$set": {"hen_count": active_hens}})
    
    return {"message": "Hen removed"}

@api_router.post("/hens/{hen_id}/seen")
async def mark_hen_seen(hen_id: str, request: Request):
    """Mark a hen as seen today"""
    user_id = await require_user_id(request)
    today = date.today().isoformat()
    
    result = await db.hens.update_one(
        {"id": hen_id, "user_id": user_id},
        {"$set": {"last_seen": today, "updated_at": datetime.utcnow()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Hen not found")
    
    return {"message": f"Markerad som sedd {today}", "last_seen": today}

@api_router.get("/hens/{hen_id}/profile")
async def get_hen_profile(hen_id: str, request: Request):
    """Get full hen profile with health logs and egg statistics"""
    user_id = await require_user_id(request)
    
    hen = await db.hens.find_one({"id": hen_id, "user_id": user_id}, {"_id": 0})
    if not hen:
        raise HTTPException(status_code=404, detail="Hen not found")
    
    # Get health logs for timeline
    health_logs = await db.health_logs.find(
        {"user_id": user_id, "hen_id": hen_id}, {"_id": 0}
    ).sort("date", -1).limit(50).to_list(50)
    
    # Get egg statistics
    all_eggs = await db.egg_records.find(
        {"user_id": user_id, "hen_id": hen_id}, {"_id": 0, "count": 1, "date": 1}
    ).to_list(10000)
    
    total_eggs = sum(e['count'] for e in all_eggs)
    
    # Calculate weekly and monthly averages
    today = date.today()
    week_ago = (today - timedelta(days=7)).isoformat()
    month_ago = (today - timedelta(days=30)).isoformat()
    
    week_eggs = sum(e['count'] for e in all_eggs if e.get('date', '') >= week_ago)
    month_eggs = sum(e['count'] for e in all_eggs if e.get('date', '') >= month_ago)
    
    # Last egg date
    eggs_sorted = sorted([e for e in all_eggs if e.get('date')], key=lambda x: x['date'], reverse=True)
    last_egg_date = eggs_sorted[0]['date'] if eggs_sorted else None
    
    # Days since last egg
    days_since_egg = None
    if last_egg_date:
        last_egg = datetime.strptime(last_egg_date, '%Y-%m-%d').date()
        days_since_egg = (today - last_egg).days
    
    # Check last_seen warning
    last_seen_warning = False
    days_since_seen = None
    if hen.get('last_seen'):
        last_seen_date = datetime.strptime(hen['last_seen'], '%Y-%m-%d').date()
        days_since_seen = (today - last_seen_date).days
        warning_days = hen.get('last_seen_warning_days', 3)
        last_seen_warning = days_since_seen >= warning_days
    
    # Egg data for graph (last 30 days)
    egg_graph_data = []
    for i in range(30):
        d = (today - timedelta(days=29-i)).isoformat()
        day_eggs = sum(e['count'] for e in all_eggs if e.get('date') == d)
        egg_graph_data.append({"date": d, "count": day_eggs})
    
    return {
        **hen,
        "health_logs": health_logs,
        "statistics": {
            "total_eggs": total_eggs,
            "eggs_this_week": week_eggs,
            "eggs_this_month": month_eggs,
            "weekly_average": round(week_eggs / 7, 1),
            "monthly_average": round(month_eggs / 30, 1),
            "last_egg_date": last_egg_date,
            "days_since_egg": days_since_egg,
            "no_eggs_warning": days_since_egg is not None and days_since_egg >= 14
        },
        "last_seen_warning": last_seen_warning,
        "days_since_seen": days_since_seen,
        "egg_graph_data": egg_graph_data
    }

# ============ HEALTH LOG ENDPOINTS ============
@api_router.post("/health-logs", response_model=HealthLog)
async def create_health_log(log: HealthLogCreate, request: Request):
    """Create a health log entry for a hen (Premium only)"""
    user_id = await require_user_id(request)
    
    # Check premium status - Health log is premium only
    subscription = await db.subscriptions.find_one({"user_id": user_id})
    is_premium = subscription.get('is_active', False) if subscription else False
    
    if not is_premium:
        raise HTTPException(status_code=403, detail="Premium krävs för hälsologgen. Uppgradera för att spåra hälsa per höna.")
    
    # Verify hen exists
    hen = await db.hens.find_one({"id": log.hen_id, "user_id": user_id})
    if not hen:
        raise HTTPException(status_code=404, detail="Hen not found")
    
    health_log = HealthLog(user_id=user_id, **log.dict())
    await db.health_logs.insert_one(health_log.dict())
    return health_log

@api_router.get("/health-logs")
async def get_health_logs(request: Request, hen_id: Optional[str] = None, limit: int = 50):
    """Get health logs, optionally filtered by hen (Premium only)"""
    user_id = await require_user_id(request)
    
    # Check premium status - Health log is premium only
    subscription = await db.subscriptions.find_one({"user_id": user_id})
    is_premium = subscription.get('is_active', False) if subscription else False
    
    if not is_premium:
        # Return empty list for free users - they shouldn't see health logs
        return []
    
    query = {"user_id": user_id}
    if hen_id:
        query["hen_id"] = hen_id
    
    logs = await db.health_logs.find(query, {"_id": 0}).sort("date", -1).limit(limit).to_list(limit)
    return logs

@api_router.get("/health-logs/{hen_id}")
async def get_hen_health_logs(hen_id: str, request: Request, limit: int = 20):
    """Get health logs for a specific hen"""
    user_id = await require_user_id(request)
    logs = await db.health_logs.find(
        {"user_id": user_id, "hen_id": hen_id}, 
        {"_id": 0}
    ).sort("date", -1).limit(limit).to_list(limit)
    return logs

@api_router.delete("/health-logs/{log_id}")
async def delete_health_log(log_id: str, request: Request):
    """Delete a health log entry"""
    user_id = await require_user_id(request)
    result = await db.health_logs.delete_one({"id": log_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Log not found")
    return {"message": "Log deleted"}

# ============ HATCHING/INCUBATION ENDPOINTS (ETAPP 3 - PREMIUM) ============
@api_router.post("/hatching")
async def create_hatching(hatching: HatchingCreate, request: Request):
    """Create a new hatching/incubation record (Premium only)"""
    user_id = await require_user_id(request)
    
    # Check premium status
    subscription = await db.subscriptions.find_one({"user_id": user_id})
    is_premium = subscription.get('is_active', False) if subscription else False
    
    if not is_premium:
        raise HTTPException(status_code=403, detail="Premium krävs för kläckningsmodulen")
    
    # Calculate expected hatch date
    start = datetime.strptime(hatching.start_date, '%Y-%m-%d').date()
    expected_hatch = (start + timedelta(days=hatching.expected_hatch_days)).isoformat()
    
    new_hatching = Hatching(
        user_id=user_id,
        start_date=hatching.start_date,
        expected_hatch_date=expected_hatch,
        egg_count=hatching.egg_count,
        hen_id=hatching.hen_id,
        incubator_name=hatching.incubator_name,
        notes=hatching.notes,
        expected_hatch_days=hatching.expected_hatch_days
    )
    
    await db.hatchings.insert_one(new_hatching.dict())
    
    return {
        **new_hatching.dict(),
        "message": f"Kläckning registrerad! Förväntat kläckningsdatum: {expected_hatch}",
        "days_remaining": hatching.expected_hatch_days
    }

@api_router.get("/hatching")
async def get_hatchings(request: Request, include_completed: bool = False):
    """Get all hatching records"""
    user_id = await require_user_id(request)
    today = date.today()
    
    query = {"user_id": user_id}
    if not include_completed:
        query["status"] = "incubating"
    
    hatchings = await db.hatchings.find(query, {"_id": 0}).sort("expected_hatch_date", 1).to_list(100)
    
    # Calculate days remaining for each
    result = []
    for h in hatchings:
        expected = datetime.strptime(h['expected_hatch_date'], '%Y-%m-%d').date()
        days_remaining = (expected - today).days
        
        # Get hen name if linked
        hen_name = None
        if h.get('hen_id'):
            hen = await db.hens.find_one({"id": h['hen_id']}, {"_id": 0, "name": 1})
            hen_name = hen.get('name') if hen else None
        
        result.append({
            **h,
            "days_remaining": days_remaining,
            "hen_name": hen_name,
            "is_overdue": days_remaining < 0 and h['status'] == 'incubating',
            "is_due_soon": 0 <= days_remaining <= 3 and h['status'] == 'incubating'
        })
    
    return result

@api_router.get("/hatching/{hatching_id}")
async def get_hatching_detail(hatching_id: str, request: Request):
    """Get detailed hatching record"""
    user_id = await require_user_id(request)
    
    hatching = await db.hatchings.find_one({"id": hatching_id, "user_id": user_id}, {"_id": 0})
    if not hatching:
        raise HTTPException(status_code=404, detail="Kläckning hittades inte")
    
    today = date.today()
    expected = datetime.strptime(hatching['expected_hatch_date'], '%Y-%m-%d').date()
    start = datetime.strptime(hatching['start_date'], '%Y-%m-%d').date()
    days_remaining = (expected - today).days
    days_elapsed = (today - start).days
    
    # Get hen name if linked
    hen_name = None
    if hatching.get('hen_id'):
        hen = await db.hens.find_one({"id": hatching['hen_id']}, {"_id": 0, "name": 1})
        hen_name = hen.get('name') if hen else None
    
    return {
        **hatching,
        "days_remaining": days_remaining,
        "days_elapsed": days_elapsed,
        "hen_name": hen_name,
        "progress_percent": min(100, int((days_elapsed / hatching.get('expected_hatch_days', 21)) * 100)),
        "is_overdue": days_remaining < 0 and hatching['status'] == 'incubating',
        "is_due_soon": 0 <= days_remaining <= 3 and hatching['status'] == 'incubating'
    }

@api_router.put("/hatching/{hatching_id}")
async def update_hatching(hatching_id: str, update: HatchingUpdate, request: Request):
    """Update a hatching record"""
    user_id = await require_user_id(request)
    
    hatching = await db.hatchings.find_one({"id": hatching_id, "user_id": user_id})
    if not hatching:
        raise HTTPException(status_code=404, detail="Kläckning hittades inte")
    
    update_data = {k: v for k, v in update.dict().items() if v is not None}
    update_data['updated_at'] = datetime.now(timezone.utc)
    
    # If marking as hatched and no actual hatch date, use today
    if update.status == HatchingStatus.HATCHED and not update.actual_hatch_date:
        update_data['actual_hatch_date'] = date.today().isoformat()
    
    await db.hatchings.update_one(
        {"id": hatching_id, "user_id": user_id},
        {"$set": update_data}
    )
    
    updated = await db.hatchings.find_one({"id": hatching_id}, {"_id": 0})
    
    message = "Kläckning uppdaterad"
    if update.status == HatchingStatus.HATCHED:
        message = f"🐣 Grattis! {update.hatched_count or updated.get('egg_count', 0)} kycklingar har kläckts!"
    elif update.status == HatchingStatus.FAILED:
        message = "Kläckning markerad som misslyckad"
    elif update.status == HatchingStatus.CANCELLED:
        message = "Kläckning avbruten"
    
    return {**updated, "message": message}

@api_router.delete("/hatching/{hatching_id}")
async def delete_hatching(hatching_id: str, request: Request):
    """Delete a hatching record"""
    user_id = await require_user_id(request)
    result = await db.hatchings.delete_one({"id": hatching_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Kläckning hittades inte")
    return {"message": "Kläckning borttagen"}

@api_router.get("/hatching-alerts")
async def get_hatching_alerts(request: Request):
    """Get upcoming hatching alerts (for notifications)"""
    user_id = await require_user_id(request)
    today = date.today()
    
    # Get active hatchings
    hatchings = await db.hatchings.find(
        {"user_id": user_id, "status": "incubating"},
        {"_id": 0}
    ).to_list(100)
    
    alerts = []
    for h in hatchings:
        expected = datetime.strptime(h['expected_hatch_date'], '%Y-%m-%d').date()
        days_remaining = (expected - today).days
        
        # Get hen name if linked
        hen_name = None
        if h.get('hen_id'):
            hen = await db.hens.find_one({"id": h['hen_id']}, {"_id": 0, "name": 1})
            hen_name = hen.get('name') if hen else None
        
        source = hen_name or h.get('incubator_name', 'Kuvös')
        
        if days_remaining == 0:
            alerts.append({
                "hatching_id": h['id'],
                "type": "hatch_day",
                "priority": "high",
                "message": f"🐣 Idag är kläckningsdag! {h['egg_count']} ägg i {source}",
                "days_remaining": 0
            })
        elif days_remaining == 1:
            alerts.append({
                "hatching_id": h['id'],
                "type": "one_day",
                "priority": "high",
                "message": f"🥚 Imorgon kläcks {h['egg_count']} ägg i {source}!",
                "days_remaining": 1
            })
        elif days_remaining == 3:
            alerts.append({
                "hatching_id": h['id'],
                "type": "three_days",
                "priority": "medium",
                "message": f"🥚 3 dagar kvar tills kläckning i {source}",
                "days_remaining": 3
            })
        elif days_remaining < 0:
            alerts.append({
                "hatching_id": h['id'],
                "type": "overdue",
                "priority": "high",
                "message": f"⚠️ Kläckning försenad: {source} ({abs(days_remaining)} dagar sedan förväntad)",
                "days_remaining": days_remaining
            })
    
    return {
        "total_alerts": len(alerts),
        "alerts": alerts
    }

# ============ EGG RECORD ENDPOINTS ============
@api_router.post("/eggs", response_model=EggRecord)
async def create_egg_record(record: EggRecordCreate, request: Request):
    """Log eggs collected for a date"""
    user_id = await require_user_id(request)
    
    if record.hen_id:
        egg_record = EggRecord(user_id=user_id, **record.dict())
        await db.egg_records.insert_one(egg_record.dict())
        return egg_record
    
    existing = await db.egg_records.find_one({"date": record.date, "hen_id": None, "user_id": user_id})
    if existing:
        await db.egg_records.update_one(
            {"id": existing['id']},
            {"$set": {"count": record.count, "notes": record.notes}}
        )
        updated = await db.egg_records.find_one({"date": record.date, "hen_id": None, "user_id": user_id})
        return EggRecord(**updated)
    
    egg_record = EggRecord(user_id=user_id, **record.dict())
    await db.egg_records.insert_one(egg_record.dict())
    return egg_record

@api_router.get("/eggs", response_model=List[EggRecord])
async def get_egg_records(
    request: Request,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    hen_id: Optional[str] = None,
    limit: int = 100
):
    """Get egg records with optional date filtering"""
    user_id = await require_user_id(request)
    query = {"user_id": user_id}
    if start_date:
        query["date"] = {"$gte": start_date}
    if end_date:
        if "date" in query:
            query["date"]["$lte"] = end_date
        else:
            query["date"] = {"$lte": end_date}
    if hen_id:
        query["hen_id"] = hen_id
    
    records = await db.egg_records.find(query).sort("date", -1).to_list(limit)
    return [EggRecord(**r) for r in records]

@api_router.delete("/eggs/{record_id}")
async def delete_egg_record(record_id: str, request: Request):
    """Delete an egg record"""
    user_id = await require_user_id(request)
    result = await db.egg_records.delete_one({"id": record_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Record not found")
    return {"message": "Record deleted"}

# ============ TRANSACTION ENDPOINTS ============
@api_router.post("/transactions", response_model=Transaction)
async def create_transaction(transaction: TransactionCreate, request: Request):
    """Create a new transaction"""
    user_id = await require_user_id(request)
    trans = Transaction(user_id=user_id, **transaction.dict())
    await db.transactions.insert_one(trans.dict())
    return trans

@api_router.get("/transactions", response_model=List[Transaction])
async def get_transactions(
    request: Request,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    type: Optional[TransactionType] = None,
    limit: int = 100
):
    """Get transactions with optional filtering"""
    user_id = await require_user_id(request)
    query = {"user_id": user_id}
    if start_date:
        query["date"] = {"$gte": start_date}
    if end_date:
        if "date" in query:
            query["date"]["$lte"] = end_date
        else:
            query["date"] = {"$lte": end_date}
    if type:
        query["type"] = type
    
    transactions = await db.transactions.find(query).sort("date", -1).to_list(limit)
    return [Transaction(**t) for t in transactions]

@api_router.delete("/transactions/{transaction_id}")
async def delete_transaction(transaction_id: str, request: Request):
    """Delete a transaction"""
    user_id = await require_user_id(request)
    result = await db.transactions.delete_one({"id": transaction_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return {"message": "Transaction deleted"}

# ============ FEED MANAGEMENT API (ETAPP 4) ============
@api_router.post("/feed", response_model=dict)
async def create_feed_record(record: FeedRecordCreate, request: Request):
    """Create a new feed record (Premium only)"""
    user_id = await require_user_id(request)
    
    # Check premium status - Feed management is premium only
    subscription = await db.subscriptions.find_one({"user_id": user_id})
    is_premium = subscription.get('is_active', False) if subscription else False
    
    if not is_premium:
        raise HTTPException(status_code=403, detail="Premium krävs för foderhantering. Uppgradera för att spåra foder och kostnader.")
    
    feed_record = FeedRecord(
        user_id=user_id,
        date=record.date,
        feed_type=record.feed_type,
        amount_kg=record.amount_kg,
        cost=record.cost,
        is_purchase=record.is_purchase,
        brand=record.brand,
        notes=record.notes
    )
    
    await db.feed_records.insert_one(feed_record.model_dump())
    
    # Update inventory
    if record.is_purchase:
        # Add to inventory
        await db.feed_inventory.update_one(
            {"user_id": user_id, "feed_type": record.feed_type.value},
            {
                "$inc": {"current_stock_kg": record.amount_kg},
                "$set": {
                    "updated_at": datetime.now(timezone.utc),
                    "brand": record.brand
                },
                "$setOnInsert": {
                    "id": str(uuid.uuid4()),
                    "user_id": user_id,
                    "feed_type": record.feed_type.value,
                    "low_stock_threshold_kg": 5.0
                }
            },
            upsert=True
        )
    else:
        # Remove from inventory (consumption)
        await db.feed_inventory.update_one(
            {"user_id": user_id, "feed_type": record.feed_type.value},
            {
                "$inc": {"current_stock_kg": -record.amount_kg},
                "$set": {"updated_at": datetime.now(timezone.utc)}
            }
        )
    
    result = feed_record.model_dump()
    result.pop('_id', None)
    return result

@api_router.get("/feed")
async def get_feed_records(
    request: Request,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    feed_type: Optional[str] = None,
    is_purchase: Optional[bool] = None,
    limit: int = 100
):
    """Get feed records with optional filters (Premium only)"""
    user_id = await require_user_id(request)
    
    # Check premium status - Feed management is premium only
    subscription = await db.subscriptions.find_one({"user_id": user_id})
    is_premium = subscription.get('is_active', False) if subscription else False
    
    if not is_premium:
        return []  # Return empty array for free users
    
    query = {"user_id": user_id}
    if start_date:
        query["date"] = {"$gte": start_date}
    if end_date:
        if "date" in query:
            query["date"]["$lte"] = end_date
        else:
            query["date"] = {"$lte": end_date}
    if feed_type:
        query["feed_type"] = feed_type
    if is_purchase is not None:
        query["is_purchase"] = is_purchase
    
    cursor = db.feed_records.find(query, {"_id": 0}).sort("date", -1).limit(limit)
    records = await cursor.to_list(length=limit)
    return records

@api_router.delete("/feed/{record_id}")
async def delete_feed_record(record_id: str, request: Request):
    """Delete a feed record"""
    user_id = await require_user_id(request)
    
    # Get record first to update inventory
    record = await db.feed_records.find_one({"id": record_id, "user_id": user_id})
    if not record:
        raise HTTPException(status_code=404, detail="Feed record not found")
    
    # Reverse inventory change
    if record.get("is_purchase"):
        await db.feed_inventory.update_one(
            {"user_id": user_id, "feed_type": record["feed_type"]},
            {"$inc": {"current_stock_kg": -record["amount_kg"]}}
        )
    else:
        await db.feed_inventory.update_one(
            {"user_id": user_id, "feed_type": record["feed_type"]},
            {"$inc": {"current_stock_kg": record["amount_kg"]}}
        )
    
    await db.feed_records.delete_one({"id": record_id, "user_id": user_id})
    return {"message": "Feed record deleted"}

@api_router.get("/feed/inventory")
async def get_feed_inventory(request: Request):
    """Get current feed inventory and alerts (Premium only)"""
    user_id = await require_user_id(request)
    
    # Check premium status - Feed management is premium only
    subscription = await db.subscriptions.find_one({"user_id": user_id})
    is_premium = subscription.get('is_active', False) if subscription else False
    
    if not is_premium:
        return {"inventory": [], "low_stock_alerts": [], "total_stock_kg": 0}
    
    cursor = db.feed_inventory.find({"user_id": user_id}, {"_id": 0})
    inventory = await cursor.to_list(length=100)
    
    # Check for low stock alerts
    alerts = []
    for item in inventory:
        if item["current_stock_kg"] <= item.get("low_stock_threshold_kg", 5.0):
            alerts.append({
                "feed_type": item["feed_type"],
                "current_stock_kg": item["current_stock_kg"],
                "threshold_kg": item.get("low_stock_threshold_kg", 5.0),
                "brand": item.get("brand")
            })
    
    return {
        "inventory": inventory,
        "low_stock_alerts": alerts,
        "total_stock_kg": sum(i["current_stock_kg"] for i in inventory)
    }

@api_router.put("/feed/inventory/{feed_type}")
async def update_inventory_settings(feed_type: str, request: Request):
    """Update inventory settings like low stock threshold"""
    user_id = await require_user_id(request)
    body = await request.json()
    
    update_fields = {"updated_at": datetime.now(timezone.utc)}
    if "low_stock_threshold_kg" in body:
        update_fields["low_stock_threshold_kg"] = body["low_stock_threshold_kg"]
    if "current_stock_kg" in body:
        update_fields["current_stock_kg"] = body["current_stock_kg"]
    
    result = await db.feed_inventory.update_one(
        {"user_id": user_id, "feed_type": feed_type},
        {"$set": update_fields}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    
    return {"message": "Inventory updated"}

@api_router.get("/feed/statistics")
async def get_feed_statistics(request: Request, days: int = 30):
    """Get feed consumption and cost statistics"""
    user_id = await require_user_id(request)
    today = date.today()
    start_date = (today - timedelta(days=days)).isoformat()
    
    # Get consumption records
    cursor = db.feed_records.find({
        "user_id": user_id,
        "date": {"$gte": start_date},
        "is_purchase": False
    }, {"_id": 0})
    consumption_records = await cursor.to_list(length=1000)
    
    # Get purchase records
    cursor = db.feed_records.find({
        "user_id": user_id,
        "date": {"$gte": start_date},
        "is_purchase": True
    }, {"_id": 0})
    purchase_records = await cursor.to_list(length=1000)
    
    # Calculate statistics
    total_consumed_kg = sum(r["amount_kg"] for r in consumption_records)
    total_purchased_kg = sum(r["amount_kg"] for r in purchase_records)
    total_cost = sum(r.get("cost", 0) or 0 for r in purchase_records)
    
    # Get hen count for feed per hen
    hen_count = await db.hens.count_documents({"user_id": user_id, "status": "active"})
    
    # Daily consumption average
    daily_avg = total_consumed_kg / days if days > 0 else 0
    
    # Cost per kg
    cost_per_kg = total_cost / total_purchased_kg if total_purchased_kg > 0 else 0
    
    # By feed type
    by_type = {}
    for r in consumption_records:
        ft = r["feed_type"]
        if ft not in by_type:
            by_type[ft] = {"consumed_kg": 0, "cost": 0}
        by_type[ft]["consumed_kg"] += r["amount_kg"]
    
    for r in purchase_records:
        ft = r["feed_type"]
        if ft not in by_type:
            by_type[ft] = {"consumed_kg": 0, "cost": 0}
        by_type[ft]["cost"] += r.get("cost", 0) or 0
    
    return {
        "period_days": days,
        "total_consumed_kg": round(total_consumed_kg, 2),
        "total_purchased_kg": round(total_purchased_kg, 2),
        "total_cost": round(total_cost, 2),
        "daily_consumption_avg_kg": round(daily_avg, 3),
        "cost_per_kg": round(cost_per_kg, 2),
        "feed_per_hen_per_day_g": round((daily_avg * 1000 / hen_count), 1) if hen_count > 0 else 0,
        "hen_count": hen_count,
        "by_feed_type": by_type
    }

# ============ INSIGHTS ENDPOINT ============
@api_router.get("/insights")
async def get_insights(request: Request, include_premium: bool = False):
    """Get productivity insights: cost per egg, top hen, productivity index + Premium features"""
    user_id = await require_user_id(request)
    today = date.today()
    
    # Check premium status
    subscription = await db.subscriptions.find_one({"user_id": user_id})
    is_premium = subscription.get('is_active', False) if subscription else False
    
    # Get all eggs with dates
    all_eggs = await db.egg_records.find({"user_id": user_id}, {"_id": 0, "count": 1, "hen_id": 1, "date": 1}).to_list(10000)
    total_eggs = sum(e['count'] for e in all_eggs)
    
    # Get all transactions
    all_transactions = await db.transactions.find({"user_id": user_id}, {"_id": 0, "amount": 1, "type": 1, "date": 1}).to_list(10000)
    total_costs = sum(t['amount'] for t in all_transactions if t['type'] == 'cost')
    total_sales = sum(t['amount'] for t in all_transactions if t['type'] == 'sale')
    
    # Cost per egg
    cost_per_egg = total_costs / total_eggs if total_eggs > 0 else 0
    
    # Get eggs per hen
    eggs_per_hen = {}
    eggs_by_date = {}
    for egg in all_eggs:
        hen_id = egg.get('hen_id')
        egg_date = egg.get('date')
        if hen_id:
            eggs_per_hen[hen_id] = eggs_per_hen.get(hen_id, 0) + egg['count']
        if egg_date:
            eggs_by_date[egg_date] = eggs_by_date.get(egg_date, 0) + egg['count']
    
    # Find top hen
    top_hen = None
    if eggs_per_hen:
        top_hen_id = max(eggs_per_hen, key=eggs_per_hen.get)
        top_hen_eggs = eggs_per_hen[top_hen_id]
        hen_doc = await db.hens.find_one({"id": top_hen_id}, {"_id": 0, "name": 1, "id": 1})
        if hen_doc:
            top_hen = {"id": hen_doc['id'], "name": hen_doc['name'], "eggs": top_hen_eggs}
    
    # Productivity index (eggs per hen per day this month)
    settings = await db.coop_settings.find_one({"user_id": user_id})
    hen_count = settings['hen_count'] if settings else 0
    
    month_start = f"{today.year:04d}-{today.month:02d}-01"
    month_eggs = [e for e in all_eggs if e.get('date', '') >= month_start]
    month_total = sum(e['count'] for e in month_eggs)
    days_this_month = today.day
    
    productivity_index = 0
    if hen_count > 0 and days_this_month > 0:
        productivity_index = round((month_total / hen_count / days_this_month) * 100, 1)
    
    # Hen ranking with lifecycle
    hen_ranking = []
    hens = await db.hens.find({"user_id": user_id, "is_active": True}, {"_id": 0, "id": 1, "name": 1, "birth_date": 1}).to_list(100)
    for hen in hens:
        hen_eggs = eggs_per_hen.get(hen['id'], 0)
        age_days = None
        lifecycle = None
        if hen.get('birth_date'):
            try:
                birth = datetime.strptime(hen['birth_date'], '%Y-%m-%d').date()
                age_days = (today - birth).days
                if age_days < 140:
                    lifecycle = "unghöna"
                elif age_days < 365:
                    lifecycle = "peak"
                elif age_days < 730:
                    lifecycle = "normal"
                else:
                    lifecycle = "senior"
            except:
                pass
        hen_ranking.append({
            "id": hen['id'],
            "name": hen['name'],
            "eggs": hen_eggs,
            "age_days": age_days,
            "lifecycle": lifecycle
        })
    hen_ranking.sort(key=lambda x: x['eggs'], reverse=True)
    
    # Base response (free tier)
    response = {
        "cost_per_egg": round(cost_per_egg, 2),
        "total_eggs": total_eggs,
        "total_costs": total_costs,
        "top_hen": top_hen,
        "productivity_index": productivity_index,
        "hen_count": hen_count,
        "hen_ranking": hen_ranking[:10],
        "is_premium": is_premium,
        # New useful insights
        "best_day": None,
        "feed_cost_per_egg": 0,
        "average_eggs_per_day": 0,
        "total_sales": total_sales,
        "profit_per_egg": 0,
        "days_tracked": len(eggs_by_date),
    }
    
    # Calculate best day
    if eggs_by_date:
        best_date = max(eggs_by_date, key=eggs_by_date.get)
        response["best_day"] = {
            "date": best_date,
            "eggs": eggs_by_date[best_date]
        }
    
    # Calculate average eggs per day
    if eggs_by_date:
        response["average_eggs_per_day"] = round(total_eggs / len(eggs_by_date), 1)
    
    # Calculate feed cost per egg (only feed-related costs)
    feed_costs = sum(t['amount'] for t in all_transactions 
                    if t['type'] == 'cost' and 'foder' in str(t.get('category', '')).lower())
    if total_eggs > 0:
        response["feed_cost_per_egg"] = round(feed_costs / total_eggs, 2)
    
    # Calculate profit per egg
    if total_eggs > 0 and total_sales > 0:
        response["profit_per_egg"] = round((total_sales - total_costs) / total_eggs, 2)
    
    # ============ PREMIUM FEATURES ============
    if is_premium or include_premium:
        
        # 1. 7-DAY FORECAST (based on 14-day moving average)
        forecast_days = 14
        forecast_start = (today - timedelta(days=forecast_days)).isoformat()
        recent_eggs = [e for e in all_eggs if e.get('date', '') >= forecast_start]
        recent_total = sum(e['count'] for e in recent_eggs)
        daily_avg = recent_total / forecast_days if forecast_days > 0 else 0
        forecast_7_days = round(daily_avg * 7)
        
        response["premium"] = {
            "forecast_7_days": forecast_7_days,
            "daily_average": round(daily_avg, 1)
        }
        
        # 2. FLOCK PRODUCTION STATUS (30-day baseline)
        baseline_days = 30
        baseline_start = (today - timedelta(days=baseline_days)).isoformat()
        baseline_eggs = [e for e in all_eggs if e.get('date', '') >= baseline_start]
        baseline_total = sum(e['count'] for e in baseline_eggs)
        baseline_daily = baseline_total / baseline_days if baseline_days > 0 else 0
        
        # Compare last 7 days to baseline
        week_start = (today - timedelta(days=7)).isoformat()
        week_eggs = [e for e in all_eggs if e.get('date', '') >= week_start]
        week_total = sum(e['count'] for e in week_eggs)
        week_daily = week_total / 7
        
        if baseline_daily > 0:
            deviation_percent = ((week_daily - baseline_daily) / baseline_daily) * 100
        else:
            deviation_percent = 0
        
        # Check if user has any eggs at all
        if total_eggs == 0:
            production_status = "no_data"
            production_text = "📝 Inga ägg registrerade än"
        elif deviation_percent < -15:
            production_status = "low"
            production_text = "🟡 Låg produktion"
        elif deviation_percent > 15:
            production_status = "high"
            production_text = "🔵 Hög produktion"
        else:
            production_status = "normal"
            production_text = "🟢 Normal produktion"
        
        response["premium"]["production_status"] = production_status
        response["premium"]["production_text"] = production_text
        response["premium"]["deviation_percent"] = round(deviation_percent, 1)
        
        # 3. HEN DEVIATION DETECTION
        deviating_hens = []
        for hen in hens:
            hen_id = hen['id']
            hen_name = hen['name']
            
            # Eggs last 7 days for this hen
            week_hen_eggs = [e for e in all_eggs 
                           if e.get('hen_id') == hen_id and e.get('date', '') >= week_start]
            eggs_last_7 = sum(e['count'] for e in week_hen_eggs)
            
            # Eggs last 3 days for this hen
            three_days_start = (today - timedelta(days=3)).isoformat()
            three_day_hen_eggs = [e for e in all_eggs 
                                  if e.get('hen_id') == hen_id and e.get('date', '') >= three_days_start]
            eggs_last_3 = sum(e['count'] for e in three_day_hen_eggs)
            
            # Trigger: ≥1 egg last 7 days AND 0 eggs last 3 days
            if eggs_last_7 >= 1 and eggs_last_3 == 0:
                deviating_hens.append({
                    "id": hen_id,
                    "name": hen_name,
                    "eggs_last_7_days": eggs_last_7,
                    "eggs_last_3_days": eggs_last_3,
                    "alert": f"{hen_name} har inte värpt på 3 dagar"
                })
        
        response["premium"]["deviating_hens"] = deviating_hens
        
        # 4. ECONOMY COMPARISON (this month vs last month)
        # This month
        this_month_start = month_start
        this_month_transactions = [t for t in all_transactions if t.get('date', '') >= this_month_start]
        this_month_costs = sum(t['amount'] for t in this_month_transactions if t['type'] == 'cost')
        this_month_sales = sum(t['amount'] for t in this_month_transactions if t['type'] == 'sale')
        this_month_profit = this_month_sales - this_month_costs
        
        # Last month
        if today.month == 1:
            last_month_start = f"{today.year-1:04d}-12-01"
            last_month_end = f"{today.year:04d}-01-01"
        else:
            last_month_start = f"{today.year:04d}-{today.month-1:02d}-01"
            last_month_end = this_month_start
        
        last_month_transactions = [t for t in all_transactions 
                                   if last_month_start <= t.get('date', '') < last_month_end]
        last_month_costs = sum(t['amount'] for t in last_month_transactions if t['type'] == 'cost')
        last_month_sales = sum(t['amount'] for t in last_month_transactions if t['type'] == 'sale')
        last_month_profit = last_month_sales - last_month_costs
        
        # Comparison
        profit_change = this_month_profit - last_month_profit
        if last_month_profit != 0:
            profit_change_percent = (profit_change / abs(last_month_profit)) * 100
        else:
            profit_change_percent = 0 if this_month_profit == 0 else 100
        
        response["premium"]["economy"] = {
            "this_month": {
                "costs": this_month_costs,
                "sales": this_month_sales,
                "profit": this_month_profit
            },
            "last_month": {
                "costs": last_month_costs,
                "sales": last_month_sales,
                "profit": last_month_profit
            },
            "change": profit_change,
            "change_percent": round(profit_change_percent, 1)
        }
        
        # 5. INSIGHT SUMMARY (rule-based text)
        summary_parts = []
        
        # Production status
        summary_parts.append(f"Produktionen är {production_status.replace('low', 'låg').replace('high', 'hög').replace('normal', 'normal')}.")
        
        # Forecast
        summary_parts.append(f"Prognos: ~{forecast_7_days} ägg kommande vecka.")
        
        # Deviating hens
        if deviating_hens:
            hen_names = ", ".join([h['name'] for h in deviating_hens[:2]])
            if len(deviating_hens) > 2:
                hen_names += f" +{len(deviating_hens)-2} till"
            summary_parts.append(f"{hen_names} avviker från sitt snitt.")
        
        # Economy
        if profit_change > 0:
            summary_parts.append(f"Ekonomin är {profit_change:.0f} kr bättre än förra månaden.")
        elif profit_change < 0:
            summary_parts.append(f"Ekonomin är {abs(profit_change):.0f} kr sämre än förra månaden.")
        
        response["premium"]["summary"] = " ".join(summary_parts)
    
    return response

# ============ FREE TIER DATA LIMITS ============
# Free users can only VIEW the last 30 days. ALL data is always saved.
# When they upgrade to Premium, all historical data is unlocked.
FREE_DATA_HISTORY_DAYS = 30

@api_router.get("/account/data-limits")
async def get_data_limits(request: Request):
    """Get information about data limits and hidden data for free users"""
    user_id = await require_user_id(request)
    today = date.today()
    
    # Check premium status
    subscription = await db.subscriptions.find_one({"user_id": user_id})
    is_premium = subscription.get('is_active', False) if subscription else False
    
    # Check if trial/premium is expiring soon
    trial_warning = False
    days_until_expiry = None
    if subscription:
        expires_at = subscription.get('expires_at')
        if expires_at:
            if isinstance(expires_at, str):
                expires_at = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            days_until_expiry = (expires_at.date() - today).days
            if 0 < days_until_expiry <= 7:
                trial_warning = True
    
    # If premium, no data limits apply
    if is_premium:
        return {
            "is_premium": True,
            "data_limit_days": None,
            "oldest_allowed_date": None,
            "hidden_data": None,
            "trial_warning": trial_warning,
            "days_until_expiry": days_until_expiry,
            "plan": subscription.get('plan') if subscription else None
        }
    
    # Calculate cutoff date for free users (30 days visibility)
    cutoff_date = (today - timedelta(days=FREE_DATA_HISTORY_DAYS)).isoformat()
    
    # Find oldest data to calculate months of hidden history
    oldest_egg = await db.egg_records.find_one(
        {"user_id": user_id},
        sort=[("date", 1)]
    )
    
    # Count hidden data (older than 30 days, but NOT deleted)
    eggs_hidden = await db.egg_records.count_documents({
        "user_id": user_id,
        "date": {"$lt": cutoff_date}
    })
    
    transactions_hidden = await db.transactions.count_documents({
        "user_id": user_id,
        "date": {"$lt": cutoff_date}
    })
    
    health_logs_hidden = await db.health_logs.count_documents({
        "user_id": user_id,
        "date": {"$lt": cutoff_date}
    })
    
    total_hidden = eggs_hidden + transactions_hidden + health_logs_hidden
    
    # Calculate months of hidden data
    months_hidden = 0
    if oldest_egg and oldest_egg.get('date'):
        oldest_date_str = oldest_egg['date']
        oldest_date = date.fromisoformat(oldest_date_str)
        cutoff = date.fromisoformat(cutoff_date)
        if oldest_date < cutoff:
            days_hidden = (cutoff - oldest_date).days
            months_hidden = max(1, days_hidden // 30)
    
    return {
        "is_premium": False,
        "data_limit_days": FREE_DATA_HISTORY_DAYS,
        "oldest_allowed_date": cutoff_date,
        "hidden_data": {
            "total": total_hidden,
            "eggs": eggs_hidden,
            "transactions": transactions_hidden,
            "health_logs": health_logs_hidden,
            "months_of_history": months_hidden
        },
        "trial_warning": trial_warning,
        "days_until_expiry": days_until_expiry,
        "plan": subscription.get('plan') if subscription else None,
        "message": f"Du har {months_hidden} månaders statistik sparad – uppgradera till Premium för att låsa upp den!" if months_hidden > 0 else None
    }

# ============ STATISTICS ENDPOINTS ============
@api_router.get("/statistics/today")
async def get_today_statistics(request: Request):
    """Get today's statistics"""
    user_id = await require_user_id(request)
    today = date.today().isoformat()
    
    egg_records = await db.egg_records.find({"date": today, "user_id": user_id}).to_list(100)
    eggs_today = sum(r['count'] for r in egg_records)
    
    transactions = await db.transactions.find({"date": today, "user_id": user_id}).to_list(100)
    costs = sum(t['amount'] for t in transactions if t['type'] == 'cost')
    sales = sum(t['amount'] for t in transactions if t['type'] == 'sale')
    
    settings = await db.coop_settings.find_one({"user_id": user_id})
    hen_count = settings['hen_count'] if settings else 0
    
    return {
        "date": today,
        "egg_count": eggs_today,
        "hen_count": hen_count,
        "total_costs": costs,
        "total_sales": sales,
        "net": sales - costs
    }

@api_router.get("/statistics/month/{year}/{month}")
async def get_month_statistics(year: int, month: int, request: Request):
    """Get statistics for a specific month"""
    user_id = await require_user_id(request)
    start_date = f"{year:04d}-{month:02d}-01"
    if month == 12:
        end_date = f"{year+1:04d}-01-01"
    else:
        end_date = f"{year:04d}-{month+1:02d}-01"
    
    eggs = await db.egg_records.find({
        "user_id": user_id,
        "date": {"$gte": start_date, "$lt": end_date}
    }, {"_id": 0, "count": 1, "date": 1}).to_list(1000)
    total_eggs = sum(e['count'] for e in eggs)
    days_with_eggs = len(set(e['date'] for e in eggs))
    avg_eggs = total_eggs / days_with_eggs if days_with_eggs > 0 else 0
    
    transactions = await db.transactions.find({
        "user_id": user_id,
        "date": {"$gte": start_date, "$lt": end_date}
    }, {"_id": 0, "amount": 1, "type": 1, "date": 1}).to_list(1000)
    total_costs = sum(t['amount'] for t in transactions if t['type'] == 'cost')
    total_sales = sum(t['amount'] for t in transactions if t['type'] == 'sale')
    
    settings = await db.coop_settings.find_one({"user_id": user_id})
    hen_count = settings['hen_count'] if settings else 0
    eggs_per_hen = total_eggs / hen_count if hen_count > 0 else None
    
    daily_data = {}
    for egg in eggs:
        d = egg['date']
        if d not in daily_data:
            daily_data[d] = {'date': d, 'eggs': 0, 'costs': 0, 'sales': 0}
        daily_data[d]['eggs'] += egg['count']
    
    for trans in transactions:
        d = trans['date']
        if d not in daily_data:
            daily_data[d] = {'date': d, 'eggs': 0, 'costs': 0, 'sales': 0}
        if trans['type'] == 'cost':
            daily_data[d]['costs'] += trans['amount']
        else:
            daily_data[d]['sales'] += trans['amount']
    
    daily_breakdown = sorted(daily_data.values(), key=lambda x: x['date'])
    
    return {
        "year": year,
        "month": month,
        "total_eggs": total_eggs,
        "avg_eggs_per_day": round(avg_eggs, 1),
        "total_costs": total_costs,
        "total_sales": total_sales,
        "net": total_sales - total_costs,
        "eggs_per_hen": round(eggs_per_hen, 1) if eggs_per_hen else None,
        "daily_breakdown": daily_breakdown
    }

@api_router.get("/statistics/year/{year}")
async def get_year_statistics(year: int, request: Request):
    """Get statistics for a specific year"""
    user_id = await require_user_id(request)
    start_date = f"{year:04d}-01-01"
    end_date = f"{year+1:04d}-01-01"
    
    eggs = await db.egg_records.find({
        "user_id": user_id,
        "date": {"$gte": start_date, "$lt": end_date}
    }, {"_id": 0, "count": 1, "date": 1}).to_list(10000)
    total_eggs = sum(e['count'] for e in eggs)
    days_with_eggs = len(set(e['date'] for e in eggs))
    avg_eggs = total_eggs / days_with_eggs if days_with_eggs > 0 else 0
    
    transactions = await db.transactions.find({
        "user_id": user_id,
        "date": {"$gte": start_date, "$lt": end_date}
    }, {"_id": 0, "amount": 1, "type": 1, "date": 1}).to_list(10000)
    total_costs = sum(t['amount'] for t in transactions if t['type'] == 'cost')
    total_sales = sum(t['amount'] for t in transactions if t['type'] == 'sale')
    
    monthly = []
    for m in range(1, 13):
        m_start = f"{year:04d}-{m:02d}-01"
        if m == 12:
            m_end = f"{year+1:04d}-01-01"
        else:
            m_end = f"{year:04d}-{m+1:02d}-01"
        
        m_eggs = sum(e['count'] for e in eggs if m_start <= e['date'] < m_end)
        m_costs = sum(t['amount'] for t in transactions if t['type'] == 'cost' and m_start <= t['date'] < m_end)
        m_sales = sum(t['amount'] for t in transactions if t['type'] == 'sale' and m_start <= t['date'] < m_end)
        
        monthly.append({
            "month": m,
            "eggs": m_eggs,
            "costs": m_costs,
            "sales": m_sales,
            "net": m_sales - m_costs
        })
    
    return {
        "year": year,
        "total_eggs": total_eggs,
        "avg_eggs_per_day": round(avg_eggs, 1),
        "total_costs": total_costs,
        "total_sales": total_sales,
        "net": total_sales - total_costs,
        "monthly_breakdown": monthly
    }

@api_router.get("/statistics/summary")
async def get_summary_statistics(request: Request):
    """Get overall summary statistics"""
    user_id = await require_user_id(request)
    
    all_eggs = await db.egg_records.find({"user_id": user_id}, {"_id": 0, "count": 1, "date": 1}).to_list(10000)
    all_transactions = await db.transactions.find({"user_id": user_id}, {"_id": 0, "amount": 1, "type": 1, "date": 1}).to_list(10000)
    settings = await db.coop_settings.find_one({"user_id": user_id})
    
    total_eggs = sum(e['count'] for e in all_eggs)
    total_costs = sum(t['amount'] for t in all_transactions if t['type'] == 'cost')
    total_sales = sum(t['amount'] for t in all_transactions if t['type'] == 'sale')
    hen_count = settings['hen_count'] if settings else 0
    
    today = date.today()
    month_start = f"{today.year:04d}-{today.month:02d}-01"
    month_eggs = sum(e['count'] for e in all_eggs if e['date'] >= month_start)
    month_costs = sum(t['amount'] for t in all_transactions if t['type'] == 'cost' and t['date'] >= month_start)
    month_sales = sum(t['amount'] for t in all_transactions if t['type'] == 'sale' and t['date'] >= month_start)
    
    return {
        "hen_count": hen_count,
        "total_eggs_all_time": total_eggs,
        "total_costs_all_time": total_costs,
        "total_sales_all_time": total_sales,
        "net_all_time": total_sales - total_costs,
        "this_month": {
            "eggs": month_eggs,
            "costs": month_costs,
            "sales": month_sales,
            "net": month_sales - month_costs
        }
    }


@api_router.get("/statistics/insights")
async def get_statistics_insights(request: Request):
    """Get advanced statistics insights including trends, best/worst days, and hen rankings"""
    user_id = await require_user_id(request)
    
    today = date.today()
    
    # Get all egg records for this year
    year_start = f"{today.year:04d}-01-01"
    all_eggs = await db.egg_records.find(
        {"user_id": user_id, "date": {"$gte": year_start}}, 
        {"_id": 0}
    ).to_list(10000)
    
    # Current and previous month data
    current_month_start = f"{today.year:04d}-{today.month:02d}-01"
    if today.month == 1:
        prev_month_start = f"{today.year-1:04d}-12-01"
        prev_month_end = f"{today.year-1:04d}-12-31"
    else:
        prev_month_start = f"{today.year:04d}-{today.month-1:02d}-01"
        prev_month_end = f"{today.year:04d}-{today.month-1:02d}-31"
    
    current_month_eggs = [e for e in all_eggs if e['date'] >= current_month_start]
    prev_month_eggs = [e for e in all_eggs if prev_month_start <= e['date'] <= prev_month_end]
    
    current_total = sum(e['count'] for e in current_month_eggs)
    prev_total = sum(e['count'] for e in prev_month_eggs)
    
    # Calculate percentage change
    if prev_total > 0:
        change_percent = round(((current_total - prev_total) / prev_total) * 100, 1)
    else:
        change_percent = 100 if current_total > 0 else 0
    
    # Best and worst days (this month)
    daily_totals = {}
    for egg in current_month_eggs:
        d = egg['date']
        if d not in daily_totals:
            daily_totals[d] = 0
        daily_totals[d] += egg['count']
    
    best_day = None
    worst_day = None
    if daily_totals:
        best_date = max(daily_totals, key=daily_totals.get)
        worst_date = min(daily_totals, key=daily_totals.get)
        best_day = {"date": best_date, "eggs": daily_totals[best_date]}
        worst_day = {"date": worst_date, "eggs": daily_totals[worst_date]}
    
    # Hen rankings (top 5 most productive)
    hen_totals = {}
    for egg in current_month_eggs:
        if egg.get('hen_id'):
            hen_id = egg['hen_id']
            if hen_id not in hen_totals:
                hen_totals[hen_id] = 0
            hen_totals[hen_id] += egg['count']
    
    # Get hen names
    hen_rankings = []
    if hen_totals:
        sorted_hens = sorted(hen_totals.items(), key=lambda x: x[1], reverse=True)[:5]
        for hen_id, eggs in sorted_hens:
            hen = await db.hens.find_one({"id": hen_id}, {"_id": 0, "name": 1})
            hen_name = hen['name'] if hen else "Okänd"
            hen_rankings.append({"hen_id": hen_id, "name": hen_name, "eggs": eggs})
    
    # 7-day forecast (simple moving average based on last 14 days)
    fourteen_days_ago = (today - timedelta(days=14)).isoformat()
    recent_eggs = [e for e in all_eggs if e['date'] >= fourteen_days_ago]
    
    forecast_eggs = 0
    if recent_eggs:
        recent_daily = {}
        for egg in recent_eggs:
            d = egg['date']
            if d not in recent_daily:
                recent_daily[d] = 0
            recent_daily[d] += egg['count']
        
        if recent_daily:
            avg_per_day = sum(recent_daily.values()) / len(recent_daily)
            forecast_eggs = round(avg_per_day * 7)
    
    # Week comparison (this week vs last week)
    week_start = (today - timedelta(days=today.weekday())).isoformat()
    last_week_start = (today - timedelta(days=today.weekday() + 7)).isoformat()
    last_week_end = (today - timedelta(days=today.weekday() + 1)).isoformat()
    
    this_week_eggs = sum(e['count'] for e in all_eggs if e['date'] >= week_start)
    last_week_eggs = sum(e['count'] for e in all_eggs if last_week_start <= e['date'] <= last_week_end)
    
    week_change = 0
    if last_week_eggs > 0:
        week_change = round(((this_week_eggs - last_week_eggs) / last_week_eggs) * 100, 1)
    
    # Average per weekday
    weekday_totals = {i: [] for i in range(7)}
    for egg in all_eggs:
        try:
            egg_date = datetime.strptime(egg['date'], '%Y-%m-%d').date()
            weekday = egg_date.weekday()
            weekday_totals[weekday].append(egg['count'])
        except:
            pass
    
    weekday_averages = {}
    weekday_names = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag', 'Söndag']
    for i, name in enumerate(weekday_names):
        if weekday_totals[i]:
            weekday_averages[name] = round(sum(weekday_totals[i]) / len(weekday_totals[i]), 1)
        else:
            weekday_averages[name] = 0
    
    return {
        "month_comparison": {
            "current_month_eggs": current_total,
            "previous_month_eggs": prev_total,
            "change_percent": change_percent,
            "trend": "up" if change_percent > 0 else ("down" if change_percent < 0 else "stable")
        },
        "best_day": best_day,
        "worst_day": worst_day,
        "hen_rankings": hen_rankings,
        "forecast_7_days": forecast_eggs,
        "week_comparison": {
            "this_week": this_week_eggs,
            "last_week": last_week_eggs,
            "change_percent": week_change
        },
        "weekday_averages": weekday_averages
    }


@api_router.get("/statistics/advanced-insights")
async def get_advanced_insights(request: Request):
    """Get advanced statistics insights - Feed Conversion, Laying Rate, Cost Per Egg etc."""
    user_id = await require_user_id(request)
    
    today = date.today()
    thirty_days_ago = (today - timedelta(days=30)).isoformat()
    year_start = f"{today.year:04d}-01-01"
    
    # Get coop settings for hen count
    coop = await db.coop_settings.find_one({"user_id": user_id}, {"_id": 0})
    if not coop:
        coop = await db.coops.find_one({"user_id": user_id}, {"_id": 0})
    hen_count = coop.get("hen_count", 0) if coop else 0
    
    # Get egg records for calculations
    eggs_30d = await db.egg_records.find(
        {"user_id": user_id, "date": {"$gte": thirty_days_ago}},
        {"_id": 0}
    ).to_list(1000)
    
    eggs_year = await db.egg_records.find(
        {"user_id": user_id, "date": {"$gte": year_start}},
        {"_id": 0}
    ).to_list(10000)
    
    total_eggs_30d = sum(e['count'] for e in eggs_30d)
    total_eggs_year = sum(e['count'] for e in eggs_year)
    
    # Get feed consumption for last 30 days
    feed_30d = await db.feed_records.find(
        {"user_id": user_id, "date": {"$gte": thirty_days_ago}, "is_purchase": False},
        {"_id": 0}
    ).to_list(1000)
    total_feed_kg_30d = sum(f.get('amount_kg', 0) for f in feed_30d)
    
    # Get costs for last 30 days
    costs_30d = await db.transactions.find(
        {"user_id": user_id, "date": {"$gte": thirty_days_ago}, "type": "cost"},
        {"_id": 0}
    ).to_list(1000)
    total_costs_30d = sum(c.get('amount', 0) for c in costs_30d)
    
    # Get sales for last 30 days
    sales_30d = await db.transactions.find(
        {"user_id": user_id, "date": {"$gte": thirty_days_ago}, "type": "sale"},
        {"_id": 0}
    ).to_list(1000)
    total_sales_30d = sum(s.get('amount', 0) for s in sales_30d)
    
    # ===== CALCULATIONS =====
    
    # 1. Feed Conversion Ratio (kg feed per dozen eggs)
    feed_conversion = None
    if total_eggs_30d > 0 and total_feed_kg_30d > 0:
        dozens = total_eggs_30d / 12
        feed_conversion = round(total_feed_kg_30d / dozens, 2)
    
    # 2. Laying Rate (% of hens laying per day)
    laying_rate = None
    if hen_count > 0 and len(eggs_30d) > 0:
        # Calculate actual days with data
        days_with_eggs = len(set(e['date'] for e in eggs_30d))
        if days_with_eggs > 0:
            avg_eggs_per_day = total_eggs_30d / days_with_eggs
            laying_rate = round((avg_eggs_per_day / hen_count) * 100, 1)
    
    # 3. Cost Per Egg
    cost_per_egg = None
    if total_eggs_30d > 0 and total_costs_30d > 0:
        cost_per_egg = round(total_costs_30d / total_eggs_30d, 2)
    
    # 4. Revenue Per Egg
    revenue_per_egg = None
    if total_eggs_30d > 0 and total_sales_30d > 0:
        revenue_per_egg = round(total_sales_30d / total_eggs_30d, 2)
    
    # 5. Profit Per Egg
    profit_per_egg = None
    if cost_per_egg is not None:
        revenue = revenue_per_egg if revenue_per_egg else 0
        profit_per_egg = round(revenue - cost_per_egg, 2)
    
    # 6. Eggs Per Hen (monthly)
    eggs_per_hen_monthly = None
    if hen_count > 0:
        eggs_per_hen_monthly = round(total_eggs_30d / hen_count, 1)
    
    # 7. Eggs Per Hen (yearly estimate)
    eggs_per_hen_yearly = None
    if hen_count > 0 and total_eggs_year > 0:
        days_this_year = (today - date(today.year, 1, 1)).days + 1
        yearly_estimate = (total_eggs_year / days_this_year) * 365
        eggs_per_hen_yearly = round(yearly_estimate / hen_count)
    
    # 8. Feed Cost Per Egg
    feed_cost_per_egg = None
    feed_costs = [c for c in costs_30d if c.get('category') == 'feed']
    total_feed_cost = sum(c.get('amount', 0) for c in feed_costs)
    if total_eggs_30d > 0 and total_feed_cost > 0:
        feed_cost_per_egg = round(total_feed_cost / total_eggs_30d, 2)
    
    # 9. Best Laying Day of Week (based on historical data)
    weekday_totals = {i: 0 for i in range(7)}
    weekday_counts = {i: 0 for i in range(7)}
    for egg in eggs_year:
        try:
            egg_date = datetime.strptime(egg['date'], '%Y-%m-%d').date()
            weekday = egg_date.weekday()
            weekday_totals[weekday] += egg['count']
            weekday_counts[weekday] += 1
        except:
            pass
    
    best_laying_day = None
    best_avg = 0
    weekday_names = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag', 'Söndag']
    for i in range(7):
        if weekday_counts[i] > 0:
            avg = weekday_totals[i] / weekday_counts[i]
            if avg > best_avg:
                best_avg = avg
                best_laying_day = weekday_names[i]
    
    # 10. Productivity Score (0-100 based on multiple factors)
    productivity_score = None
    if hen_count > 0:
        score = 0
        factors = 0
        
        # Factor 1: Laying rate (target 80%)
        if laying_rate is not None:
            rate_score = min(laying_rate / 80 * 100, 100)
            score += rate_score
            factors += 1
        
        # Factor 2: Feed conversion (target 1.5 kg per dozen)
        if feed_conversion is not None:
            if feed_conversion <= 1.5:
                conv_score = 100
            elif feed_conversion <= 2.5:
                conv_score = 100 - ((feed_conversion - 1.5) * 50)
            else:
                conv_score = max(0, 50 - ((feed_conversion - 2.5) * 25))
            score += conv_score
            factors += 1
        
        # Factor 3: Profitability
        if profit_per_egg is not None:
            if profit_per_egg >= 2:
                profit_score = 100
            elif profit_per_egg >= 0:
                profit_score = 50 + (profit_per_egg / 2) * 50
            else:
                profit_score = max(0, 50 + profit_per_egg * 25)
            score += profit_score
            factors += 1
        
        if factors > 0:
            productivity_score = round(score / factors)
    
    return {
        "hen_count": hen_count,
        "period_days": 30,
        "total_eggs_30d": total_eggs_30d,
        "total_costs_30d": round(total_costs_30d, 2),
        "total_sales_30d": round(total_sales_30d, 2),
        "metrics": {
            "feed_conversion_ratio": {
                "value": feed_conversion,
                "unit": "kg/dussin",
                "description": "Kg foder per dussin ägg",
                "optimal_range": "1.3-1.8 kg/dussin"
            },
            "laying_rate": {
                "value": laying_rate,
                "unit": "%",
                "description": "Andel höns som värper dagligen",
                "optimal_range": "70-85%"
            },
            "cost_per_egg": {
                "value": cost_per_egg,
                "unit": "kr",
                "description": "Total kostnad per ägg"
            },
            "revenue_per_egg": {
                "value": revenue_per_egg,
                "unit": "kr",
                "description": "Intäkt per ägg"
            },
            "profit_per_egg": {
                "value": profit_per_egg,
                "unit": "kr",
                "description": "Vinst per ägg"
            },
            "feed_cost_per_egg": {
                "value": feed_cost_per_egg,
                "unit": "kr",
                "description": "Foderkostnad per ägg"
            },
            "eggs_per_hen_monthly": {
                "value": eggs_per_hen_monthly,
                "unit": "ägg/månad",
                "description": "Ägg per höna senaste 30 dagarna"
            },
            "eggs_per_hen_yearly_estimate": {
                "value": eggs_per_hen_yearly,
                "unit": "ägg/år",
                "description": "Uppskattade ägg per höna per år"
            }
        },
        "insights": {
            "best_laying_day": best_laying_day,
            "productivity_score": productivity_score
        }
    }


@api_router.get("/statistics/trend-analysis")
async def get_trend_analysis(request: Request):
    """Get trend analysis - compare current period with previous period."""
    user_id = await require_user_id(request)
    
    today = date.today()
    
    # Current period (last 30 days)
    current_start = (today - timedelta(days=30)).isoformat()
    current_end = today.isoformat()
    
    # Previous period (30-60 days ago)
    prev_start = (today - timedelta(days=60)).isoformat()
    prev_end = (today - timedelta(days=30)).isoformat()
    
    # Get coop settings for hen count
    coop = await db.coop_settings.find_one({"user_id": user_id}, {"_id": 0})
    if not coop:
        coop = await db.coops.find_one({"user_id": user_id}, {"_id": 0})
    hen_count = coop.get("hen_count", 0) if coop else 0
    
    # Current period data
    eggs_current = await db.egg_records.find(
        {"user_id": user_id, "date": {"$gte": current_start, "$lte": current_end}},
        {"_id": 0}
    ).to_list(1000)
    
    # Previous period data
    eggs_prev = await db.egg_records.find(
        {"user_id": user_id, "date": {"$gte": prev_start, "$lt": prev_end}},
        {"_id": 0}
    ).to_list(1000)
    
    # Calculate totals
    total_eggs_current = sum(e['count'] for e in eggs_current)
    total_eggs_prev = sum(e['count'] for e in eggs_prev)
    
    # Get costs
    costs_current = await db.transactions.find(
        {"user_id": user_id, "date": {"$gte": current_start}, "type": "cost"},
        {"_id": 0}
    ).to_list(1000)
    costs_prev = await db.transactions.find(
        {"user_id": user_id, "date": {"$gte": prev_start, "$lt": prev_end}, "type": "cost"},
        {"_id": 0}
    ).to_list(1000)
    
    total_costs_current = sum(c.get('amount', 0) for c in costs_current)
    total_costs_prev = sum(c.get('amount', 0) for c in costs_prev)
    
    # Get sales
    sales_current = await db.transactions.find(
        {"user_id": user_id, "date": {"$gte": current_start}, "type": "sale"},
        {"_id": 0}
    ).to_list(1000)
    sales_prev = await db.transactions.find(
        {"user_id": user_id, "date": {"$gte": prev_start, "$lt": prev_end}, "type": "sale"},
        {"_id": 0}
    ).to_list(1000)
    
    total_sales_current = sum(s.get('amount', 0) for s in sales_current)
    total_sales_prev = sum(s.get('amount', 0) for s in sales_prev)
    
    # Calculate daily averages
    days_with_data_current = len(set(e['date'] for e in eggs_current)) or 1
    days_with_data_prev = len(set(e['date'] for e in eggs_prev)) or 1
    
    avg_eggs_current = total_eggs_current / days_with_data_current
    avg_eggs_prev = total_eggs_prev / days_with_data_prev if days_with_data_prev > 0 else 0
    
    # Calculate laying rates
    laying_rate_current = (avg_eggs_current / hen_count * 100) if hen_count > 0 else None
    laying_rate_prev = (avg_eggs_prev / hen_count * 100) if hen_count > 0 else None
    
    # Calculate profit
    profit_current = total_sales_current - total_costs_current
    profit_prev = total_sales_prev - total_costs_prev
    
    # Helper function to calculate percentage change
    def calc_change(current, prev):
        if prev == 0 or prev is None:
            return None if current == 0 else 100.0
        return round(((current - prev) / prev) * 100, 1)
    
    # Calculate changes
    eggs_change = calc_change(total_eggs_current, total_eggs_prev)
    laying_rate_change = calc_change(laying_rate_current, laying_rate_prev) if laying_rate_current and laying_rate_prev else None
    costs_change = calc_change(total_costs_current, total_costs_prev)
    sales_change = calc_change(total_sales_current, total_sales_prev)
    profit_change = calc_change(profit_current, profit_prev) if profit_prev != 0 else None
    
    # Determine overall trend
    positive_indicators = 0
    negative_indicators = 0
    
    if eggs_change is not None:
        if eggs_change > 0:
            positive_indicators += 1
        elif eggs_change < 0:
            negative_indicators += 1
    
    if profit_change is not None:
        if profit_change > 0:
            positive_indicators += 1
        elif profit_change < 0:
            negative_indicators += 1
    
    if laying_rate_change is not None:
        if laying_rate_change > 0:
            positive_indicators += 1
        elif laying_rate_change < 0:
            negative_indicators += 1
    
    if positive_indicators > negative_indicators:
        overall_trend = "improving"
        trend_message = "Din flock presterar bättre än förra månaden!"
    elif negative_indicators > positive_indicators:
        overall_trend = "declining"
        trend_message = "Produktiviteten har minskat jämfört med förra månaden."
    else:
        overall_trend = "stable"
        trend_message = "Produktiviteten är stabil."
    
    # Generate insights
    insights = []
    
    if eggs_change is not None:
        if eggs_change > 10:
            insights.append(f"Äggproduktionen har ökat med {eggs_change}%!")
        elif eggs_change < -10:
            insights.append(f"Äggproduktionen har minskat med {abs(eggs_change)}%. Kontrollera foderkvalitet och hönsens hälsa.")
    
    if profit_change is not None:
        if profit_change > 0:
            insights.append(f"Vinsten har förbättrats med {profit_change}%.")
        elif profit_change < -10:
            insights.append(f"Vinsten har minskat med {abs(profit_change)}%. Granska kostnader och prissättning.")
    
    if costs_change is not None and costs_change > 20:
        insights.append(f"Kostnaderna har ökat med {costs_change}%. Överväg att se över leverantörer.")
    
    return {
        "period": {
            "current": {"start": current_start, "end": current_end, "days": 30},
            "previous": {"start": prev_start, "end": prev_end, "days": 30}
        },
        "hen_count": hen_count,
        "current_period": {
            "total_eggs": total_eggs_current,
            "avg_eggs_per_day": round(avg_eggs_current, 1),
            "laying_rate": round(laying_rate_current, 1) if laying_rate_current else None,
            "total_costs": round(total_costs_current, 2),
            "total_sales": round(total_sales_current, 2),
            "profit": round(profit_current, 2)
        },
        "previous_period": {
            "total_eggs": total_eggs_prev,
            "avg_eggs_per_day": round(avg_eggs_prev, 1),
            "laying_rate": round(laying_rate_prev, 1) if laying_rate_prev else None,
            "total_costs": round(total_costs_prev, 2),
            "total_sales": round(total_sales_prev, 2),
            "profit": round(profit_prev, 2)
        },
        "changes": {
            "eggs": {"value": eggs_change, "unit": "%"},
            "laying_rate": {"value": laying_rate_change, "unit": "%"},
            "costs": {"value": costs_change, "unit": "%"},
            "sales": {"value": sales_change, "unit": "%"},
            "profit": {"value": profit_change, "unit": "%"}
        },
        "overall_trend": overall_trend,
        "trend_message": trend_message,
        "insights": insights
    }


# ============ EMAIL REMINDERS ============
class ReminderSettings(BaseModel):
    enabled: bool = True
    time: str = "18:00"  # HH:MM format

class EmailRequest(BaseModel):
    recipient_email: EmailStr
    subject: str
    html_content: str

@api_router.get("/reminders/settings")
async def get_reminder_settings(request: Request):
    """Get reminder settings for current user"""
    user = await require_user(request)
    # Try both id formats (user_id for Google, id for email/password)
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
    if not user_doc:
        user_doc = await db.users.find_one({"id": user.user_id}, {"_id": 0})
    
    if not user_doc:
        # Return defaults if user not found
        return {"enabled": True, "time": "18:00"}
    
    return {
        "enabled": user_doc.get("reminder_enabled", True),
        "time": user_doc.get("reminder_time", "18:00")
    }

@api_router.put("/reminders/settings")
async def update_reminder_settings(request: Request, settings: ReminderSettings):
    """Update reminder settings for current user"""
    user = await require_user(request)
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {
            "reminder_enabled": settings.enabled,
            "reminder_time": settings.time
        }}
    )
    return {"message": "Påminnelseinställningar uppdaterade", "enabled": settings.enabled, "time": settings.time}

async def send_reminder_email(email: str, name: str, coop_name: str):
    """Send egg collection reminder email"""
    if not RESEND_API_KEY:
        logger.warning("RESEND_API_KEY not configured, skipping email")
        return False
    
    html_content = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 20px;">
            <span style="font-size: 48px;">🥚</span>
        </div>
        <h1 style="color: #1a1a2e; text-align: center; font-size: 24px;">Hej {name}!</h1>
        <p style="color: #333; font-size: 16px; line-height: 1.6; text-align: center;">
            Dags att plocka ägg från <strong>{coop_name}</strong>?
        </p>
        <p style="color: #666; font-size: 14px; text-align: center; margin-top: 20px;">
            Glöm inte att registrera dagens ägg i Hönsgården-appen! 🐔
        </p>
        <div style="text-align: center; margin-top: 30px;">
            <a href="{APP_URL}/api/web/" 
               style="background-color: #4ade80; color: #1a1a2e; padding: 14px 28px; text-decoration: none; border-radius: 50px; font-weight: 600; display: inline-block;">
                Öppna Hönsgården
            </a>
        </div>
        <p style="color: #888; font-size: 12px; text-align: center; margin-top: 40px;">
            Du får detta mail eftersom du aktiverat påminnelser i Hönsgården.<br>
            <a href="{APP_URL}/api/web/settings" style="color: #888;">Ändra inställningar</a>
        </p>
    </div>
    """
    
    params = {
        "from": SENDER_EMAIL,
        "to": [email],
        "subject": "🥚 Påminnelse: Dags att plocka ägg!",
        "html": html_content
    }
    
    try:
        result = await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"Reminder email sent to {email}, id: {result.get('id')}")
        return True
    except Exception as e:
        logger.error(f"Failed to send reminder email to {email}: {e}")
        return False

@api_router.post("/reminders/send-test")
async def send_test_reminder(request: Request):
    """Send a test reminder email to current user"""
    user = await require_user(request)
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
    coop = await db.coop_settings.find_one({"user_id": user.user_id}, {"_id": 0})
    coop_name = coop.get("coop_name", "Min Hönsgård") if coop else "Min Hönsgård"
    
    success = await send_reminder_email(user.email, user.name, coop_name)
    if success:
        return {"message": f"Testpåminnelse skickad till {user.email}"}
    else:
        raise HTTPException(status_code=500, detail="Kunde inte skicka påminnelse")

@api_router.post("/reminders/send-all")
async def trigger_all_reminders():
    """Trigger reminder emails for all users with reminders enabled (for cron job)"""
    users = await db.users.find({"reminder_enabled": True}, {"_id": 0}).to_list(1000)
    sent_count = 0
    
    for user_doc in users:
        email = user_doc.get("email")
        name = user_doc.get("name", "")
        user_id = user_doc.get("user_id")
        
        coop = await db.coop_settings.find_one({"user_id": user_id}, {"_id": 0})
        coop_name = coop.get("coop_name", "Min Hönsgård") if coop else "Min Hönsgård"
        
        if await send_reminder_email(email, name, coop_name):
            sent_count += 1
    
    return {"message": f"Skickade {sent_count} påminnelser", "total_users": len(users)}

# ============ ADMIN ENDPOINTS ============
@api_router.get("/admin/check")
async def check_admin_status(request: Request):
    """Check if current user is an admin"""
    user = await get_current_user(request)
    if not user:
        return {"is_admin": False}
    return {"is_admin": user.email in ADMIN_EMAILS, "email": user.email}

@api_router.get("/admin/stats")
async def get_admin_stats(request: Request):
    """Get dashboard statistics for admin"""
    await require_admin(request)
    
    # Count users
    total_users = await db.users.count_documents({})
    
    # Count active subscriptions
    active_subs = await db.subscriptions.count_documents({"is_active": True})
    
    # Count by plan
    monthly_subs = await db.subscriptions.count_documents({"is_active": True, "plan": "monthly"})
    yearly_subs = await db.subscriptions.count_documents({"is_active": True, "plan": "yearly"})
    
    # Calculate MRR (Monthly Recurring Revenue)
    monthly_price = 19  # SEK
    yearly_price = 149  # SEK per year = 12.42/month
    mrr = (monthly_subs * monthly_price) + (yearly_subs * (yearly_price / 12))
    
    # Recent signups (last 7 days)
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    recent_users = await db.users.count_documents({"created_at": {"$gte": week_ago}})
    
    # Feedback count
    new_feedback = await db.feedback.count_documents({"status": "new"})
    total_feedback = await db.feedback.count_documents({})
    
    # Cancellations last 30 days
    month_ago = datetime.now(timezone.utc) - timedelta(days=30)
    recent_cancellations = await db.cancellations.count_documents({"cancelled_at": {"$gte": month_ago}})
    
    return {
        "users": {
            "total": total_users,
            "new_last_7_days": recent_users
        },
        "subscriptions": {
            "active": active_subs,
            "monthly": monthly_subs,
            "yearly": yearly_subs,
            "mrr": round(mrr, 2)
        },
        "feedback": {
            "new": new_feedback,
            "total": total_feedback
        },
        "cancellations": {
            "last_30_days": recent_cancellations
        }
    }

@api_router.get("/admin/users")
async def get_admin_users(request: Request, skip: int = 0, limit: int = 50):
    """Get all users for admin"""
    await require_admin(request)
    
    users = await db.users.find({}, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.users.count_documents({})
    
    # Enrich with subscription data
    enriched_users = []
    for u in users:
        user_id = u.get("user_id") or u.get("id")
        sub = await db.subscriptions.find_one({"user_id": user_id}, {"_id": 0})
        enriched_users.append({
            "user_id": user_id,
            "email": u.get("email"),
            "name": u.get("name"),
            "picture": u.get("picture"),
            "created_at": u.get("created_at"),
            "is_premium": sub.get("is_active", False) if sub else False,
            "plan": sub.get("plan") if sub else None,
            "reminder_enabled": u.get("reminder_enabled", False),
            "auth_provider": u.get("auth_provider", "google"),
            "accepted_terms": u.get("accepted_terms", False),
            "accepted_terms_at": u.get("accepted_terms_at"),
            "accepted_marketing": u.get("accepted_marketing", False),
            "accepted_marketing_at": u.get("accepted_marketing_at")
        })
    
    return {"users": enriched_users, "total": total, "skip": skip, "limit": limit}

@api_router.get("/admin/subscriptions")
async def get_admin_subscriptions(request: Request, active_only: bool = False):
    """Get all subscriptions for admin"""
    await require_admin(request)
    
    # Get all subscriptions - don't filter by is_active to show all trials
    subs = await db.subscriptions.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    
    # Enrich with user data
    enriched_subs = []
    now = datetime.now(timezone.utc)
    
    for s in subs:
        user = await db.users.find_one({"user_id": s.get("user_id")}, {"_id": 0, "email": 1, "name": 1})
        if not user:
            # Try with 'id' field (some users have 'id' instead of 'user_id')
            user = await db.users.find_one({"id": s.get("user_id")}, {"_id": 0, "email": 1, "name": 1})
        
        # Parse expires_at to check if actually active
        expires_at = s.get("expires_at")
        is_actually_active = s.get("is_active", False)
        
        if expires_at:
            if isinstance(expires_at, str):
                try:
                    expires_dt = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
                    is_actually_active = expires_dt > now
                except:
                    pass
            elif isinstance(expires_at, datetime):
                is_actually_active = expires_at > now
        
        # Skip inactive if active_only requested
        if active_only and not is_actually_active:
            continue
            
        enriched_subs.append({
            "user_id": s.get("user_id"),
            "email": user.get("email") if user else "Unknown",
            "name": user.get("name") if user else "Unknown",
            "plan": s.get("plan"),
            "is_active": is_actually_active,
            "created_at": s.get("created_at"),
            "expires_at": expires_at,
            "cancelled_at": s.get("cancelled_at"),
            "purchase_source": s.get("purchase_source", "unknown")
        })
    
    return {"subscriptions": enriched_subs, "total": len(enriched_subs)}

@api_router.get("/admin/feedback")
async def get_admin_feedback(request: Request, status: str = None):
    """Get all feedback for admin"""
    await require_admin(request)
    
    query = {"status": status} if status else {}
    feedback_list = await db.feedback.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    return {"feedback": feedback_list, "total": len(feedback_list)}

@api_router.put("/admin/feedback/{feedback_id}")
async def update_feedback_status(request: Request, feedback_id: str, status: str):
    """Update feedback status"""
    await require_admin(request)
    
    result = await db.feedback.update_one(
        {"id": feedback_id},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc)}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Feedback not found")
    
    return {"message": "Status uppdaterad", "feedback_id": feedback_id, "status": status}

@api_router.delete("/admin/users/{user_id}")
async def delete_user(request: Request, user_id: str):
    """Delete a user and all their data (admin only)"""
    await require_admin(request)
    
    # Delete user data from all collections
    await db.users.delete_one({"user_id": user_id})
    await db.subscriptions.delete_one({"user_id": user_id})
    await db.user_sessions.delete_many({"user_id": user_id})
    await db.coop_settings.delete_one({"user_id": user_id})
    await db.egg_records.delete_many({"user_id": user_id})
    await db.transactions.delete_many({"user_id": user_id})
    
    logger.info(f"Admin deleted user {user_id}")
    
    return {"message": "Användare raderad", "user_id": user_id}

@api_router.put("/admin/subscriptions/{user_id}")
async def update_user_subscription(request: Request, user_id: str):
    """Update a user's subscription (admin only)
    Body: { is_active: bool, plan: string, days: number (optional, -1 for forever) }"""
    await require_admin(request)
    
    body = await request.json()
    is_active = body.get("is_active", False)
    plan = body.get("plan")
    days = body.get("days", 365)  # Default 365 days, -1 for forever
    
    update_data = {"is_active": is_active, "updated_at": datetime.now(timezone.utc)}
    if plan:
        update_data["plan"] = plan
    
    if is_active:
        if days == -1:
            # Forever - set to 100 years
            update_data["expires_at"] = datetime.now(timezone.utc) + timedelta(days=36500)
            update_data["plan"] = "lifetime"
        else:
            update_data["expires_at"] = datetime.now(timezone.utc) + timedelta(days=days)
    else:
        # Deactivate - set expiry to now
        update_data["expires_at"] = datetime.now(timezone.utc)
    
    # Also update user's is_premium flag
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"is_premium": is_active}}
    )
    
    result = await db.subscriptions.update_one(
        {"user_id": user_id},
        {"$set": update_data},
        upsert=True
    )
    
    logger.info(f"Admin updated subscription for user {user_id}: active={is_active}, days={days}")
    
    return {
        "message": "Prenumeration uppdaterad", 
        "user_id": user_id, 
        "is_active": is_active,
        "days": days if days != -1 else "forever"
    }

# ============ AI PREMIUM FEATURES ============
@api_router.get("/ai/daily-report")
async def get_ai_daily_report(request: Request):
    """Generate AI daily report - Premium only
    Returns a blurred preview for free users"""
    user_id = await require_user_id(request)
    
    # Get user info
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    user_name = user.get("name", "").split()[0] if user and user.get("name") else "hönsägare"
    
    # Check premium status
    subscription = await db.subscriptions.find_one({"user_id": user_id})
    is_premium = subscription.get('is_active', False) if subscription else False
    
    # Get coop name
    coop = await db.coops.find_one({"user_id": user_id}, {"_id": 0})
    coop_name = coop.get("coop_name", "hönsgården") if coop else "hönsgården"
    
    # Get today's data using Stockholm timezone
    today = today_str_stockholm()
    eggs_today = await db.egg_records.find({"user_id": user_id, "date": today}).to_list(100)
    total_eggs = sum(e.get('count', 0) for e in eggs_today)
    hens = await db.hens.find({"user_id": user_id, "is_active": True}).to_list(100)
    hen_count = len([h for h in hens if h.get('hen_type', 'hen') == 'hen'])
    
    # Get recent health logs
    health_logs = await db.health_logs.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("date", -1).limit(5).to_list(5)
    
    # Check if user tracks eggs per hen - look at recent egg records
    week_ago = days_ago_stockholm(7)
    recent_eggs = await db.egg_records.find(
        {"user_id": user_id, "date": {"$gte": week_ago}}
    ).to_list(500)
    
    eggs_with_hen_id = sum(1 for e in recent_eggs if e.get('hen_id'))
    total_recent_eggs = len(recent_eggs)
    tracks_per_hen = total_recent_eggs > 0 and (eggs_with_hen_id / total_recent_eggs) > 0.5
    
    # Get productivity alerts - only if user tracks per hen
    alerts = []
    if tracks_per_hen:
        for hen in hens:
            if hen.get('hen_type', 'hen') != 'hen':
                continue  # Skip roosters
            hen_eggs = await db.egg_records.find(
                {"user_id": user_id, "hen_id": hen.get("id")}
            ).sort("date", -1).limit(7).to_list(7)
            if len(hen_eggs) < 2:
                alerts.append(f"{hen.get('name', 'Okänd höna')} har inte värpt på länge")
    else:
        # Flock-level analysis instead
        if total_recent_eggs > 0:
            weekly_total = sum(e.get('count', 0) for e in recent_eggs)
            daily_avg = weekly_total / 7
            expected_min = hen_count * 0.5  # 50% production minimum
            if daily_avg < expected_min and hen_count > 0:
                alerts.append(f"Flockens produktion ({daily_avg:.1f} ägg/dag) är under förväntat ({expected_min:.0f}+ ägg/dag)")
    
    if not is_premium:
        # Return blurred/preview data for free users
        return {
            "is_premium": False,
            "preview": True,
            "used_fallback": False,
            "report": {
                "summary": "🔒 Din AI-genererade dagsrapport är klar! Uppgradera till Premium för att läsa den.",
                "blurred_preview": f"Idag har du samlat {total_eggs} ägg från {hen_count} höns. [Uppgradera för full rapport med rekommendationer och analys...]",
                "eggs_today": total_eggs,
                "hen_count": hen_count,
                "alerts_count": len(alerts)
            }
        }
    
    # Get weather data for contextual tips
    weather_data = None
    try:
        weather_doc = await db.weather_cache.find_one(
            {"user_id": user_id, "cached_at": {"$gte": datetime.now(timezone.utc) - timedelta(hours=3)}},
            {"_id": 0}
        )
        if weather_doc:
            weather_data = weather_doc.get("data", {})
    except:
        pass
    
    # Get recent egg production stats for context using Stockholm time
    week_eggs = await db.egg_records.find({"user_id": user_id, "date": {"$gte": week_ago}}).to_list(500)
    weekly_total = sum(e.get('count', 0) for e in week_eggs)
    daily_average = weekly_total / 7 if week_eggs else 0
    
    # Determine productivity level
    productivity_pct = (total_eggs / hen_count * 100) if hen_count > 0 else 0
    
    # Get current month and season context
    current_month = now_stockholm().month
    season_context = ""
    if current_month in [12, 1, 2]:
        season_context = "Vinter - kortare dagar, extra fokus på ljus och värme"
    elif current_month in [3, 4, 5]:
        season_context = "Vår - ökande äggproduktion, möjlig ruggning"
    elif current_month in [6, 7, 8]:
        season_context = "Sommar - risk för värmestress, säkerställ skugga och vatten"
    else:
        season_context = "Höst - ruggningssäsong, minskad produktion naturligt"
    
    # Generate AI report for premium users
    used_fallback = False
    ai_provider_ok = True
    
    try:
        if not EMERGENT_LLM_KEY:
            raise ValueError("EMERGENT_LLM_KEY not configured")
            
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"daily-report-{user_id}-{today}",
            system_message=f"""Du är Agda, en erfaren och varm hönsgårdsrådgivare med över 10 års erfarenhet.
Du skriver personliga, praktiska och uppmuntrande rapporter på svenska.
Du använder din djupa kunskap om hönsskötsel för att ge relevanta tips baserat på säsong, väder och produktion.

{HONSGARD_KNOWLEDGE}

VIKTIGT:
- Håll rapporten under 120 ord
- Var varm och personlig i tonen
- Ge ETT konkret, relevant tips baserat på data
- Använd max 2-3 emojis
- Avsluta alltid med 'Kacklande hälsningar, Agda 🐔'"""
        ).with_model("openai", "gpt-4o")
        
        weather_info = ""
        if weather_data:
            temp = weather_data.get("temperature", "okänd")
            desc = weather_data.get("description", "")
            weather_info = f"- Väder idag: {temp}°C, {desc}"
        
        prompt = f"""Skriv en kort daglig rapport för {user_name} som har {coop_name}.

DATA FÖR IDAG ({today}):
- Antal ägg idag: {total_eggs}
- Antal aktiva höns: {hen_count}
- Produktivitet: {productivity_pct:.0f}% (förväntat ~70-85% för bra värpraser)
- Veckosnitt: {daily_average:.1f} ägg/dag
- Produktivitetsvarningar: {', '.join(alerts) if alerts else 'Inga'}
- Senaste hälsoanteckningar: {len(health_logs)} loggade
{weather_info}

SÄSONG: {season_context}

Rapporten ska innehålla:
1. En personlig hälsning till {user_name}
2. Kort sammanfattning av produktion (jämför med veckosnitt/förväntat)
3. ETT konkret, säsongsanpassat tips från din kunskap
4. Din signatur

Anpassa tipset efter:
- Vädret (om data finns)
- Säsongen ({season_context})
- Produktionsnivån ({productivity_pct:.0f}%)
- Eventuella varningar"""
        
        message = UserMessage(text=prompt)
        ai_response = await chat.send_message(message)
        
        logger.info(f"AI daily-report generated successfully for user {user_id}")
        
        return {
            "is_premium": True,
            "preview": False,
            "used_fallback": False,
            "ai_provider_ok": True,
            "report": {
                "summary": ai_response,
                "eggs_today": total_eggs,
                "hen_count": hen_count,
                "alerts": alerts,
                "generated_at": now_stockholm().isoformat()
            }
        }
    except Exception as e:
        logger.error(f"AI report generation failed for user {user_id}: {e}")
        used_fallback = True
        ai_provider_ok = False
        
        return {
            "is_premium": True,
            "preview": False,
            "used_fallback": True,
            "ai_provider_ok": False,
            "report": {
                "summary": f"🐔 Daglig sammanfattning: {total_eggs} ägg från {hen_count} höns. " + 
                          (f"⚠️ {len(alerts)} varningar kräver uppmärksamhet." if alerts else "Allt ser bra ut!"),
                "eggs_today": total_eggs,
                "hen_count": hen_count,
                "alerts": alerts,
                "generated_at": now_stockholm().isoformat(),
                "fallback": True
            }
        }


@api_router.get("/ai/egg-forecast")
async def get_egg_forecast(request: Request):
    """7-day egg production forecast - Premium only
    Returns a blurred preview for free users"""
    user_id = await require_user_id(request)
    
    # Check premium status
    subscription = await db.subscriptions.find_one({"user_id": user_id})
    is_premium = subscription.get('is_active', False) if subscription else False
    
    # Get historical data (last 30 days) using Stockholm time
    thirty_days_ago = days_ago_stockholm(30)
    seven_days_ago = days_ago_stockholm(7)
    
    eggs_history = await db.egg_records.find(
        {"user_id": user_id, "date": {"$gte": thirty_days_ago}}
    ).to_list(1000)
    
    # Calculate daily totals
    daily_totals = {}
    for egg in eggs_history:
        date_str = egg.get('date')
        if date_str:
            daily_totals[date_str] = daily_totals.get(date_str, 0) + egg.get('count', 0)
    
    # Calculate averages and trends
    days_with_data = len(daily_totals)
    
    if daily_totals:
        avg_daily = sum(daily_totals.values()) / days_with_data
        
        # Calculate 7-day trend
        last_7_days = [daily_totals.get(days_ago_stockholm(i), 0) for i in range(7)]
        first_half = sum(last_7_days[4:7]) / 3 if any(last_7_days[4:7]) else avg_daily
        second_half = sum(last_7_days[0:3]) / 3 if any(last_7_days[0:3]) else avg_daily
        
        if first_half > 0:
            trend_pct = ((second_half - first_half) / first_half) * 100
        else:
            trend_pct = 0
            
        if trend_pct > 5:
            trend_direction = "up"
        elif trend_pct < -5:
            trend_direction = "down"
        else:
            trend_direction = "stable"
    else:
        avg_daily = 0
        trend_direction = "unknown"
        trend_pct = 0
    
    # Find best day of week (if enough data)
    best_day_of_week = None
    if days_with_data >= 14:
        day_totals = {i: [] for i in range(7)}  # 0=Monday, 6=Sunday
        for date_str, count in daily_totals.items():
            try:
                d = datetime.strptime(date_str, '%Y-%m-%d')
                day_totals[d.weekday()].append(count)
            except:
                pass
        
        day_avgs = {}
        day_names_sv = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag', 'Söndag']
        for day, counts in day_totals.items():
            if counts:
                day_avgs[day_names_sv[day]] = sum(counts) / len(counts)
        
        if day_avgs:
            best_day_of_week = max(day_avgs, key=day_avgs.get)
    
    # Data quality score
    data_quality = min(100, round((days_with_data / 30) * 100))
    
    # Get active hen count
    hens = await db.hens.count_documents({"user_id": user_id, "is_active": True, "hen_type": {"$ne": "rooster"}})
    
    # Deterministic forecast based on trend (not random!)
    forecast = []
    trend_factor = 1.0
    if trend_direction == "up":
        trend_factor = 1.02  # 2% increase per day
    elif trend_direction == "down":
        trend_factor = 0.98  # 2% decrease per day
    
    base_prediction = avg_daily
    for i in range(7):
        date_future = days_ahead_stockholm(i + 1)
        # Apply trend factor cumulatively
        predicted = round(base_prediction * (trend_factor ** (i + 1)))
        
        # Confidence based on data quality
        if days_with_data >= 21:
            confidence = "high"
        elif days_with_data >= 7:
            confidence = "medium"
        else:
            confidence = "low"
            
        forecast.append({
            "date": date_future,
            "predicted_eggs": max(0, predicted),
            "confidence": confidence
        })
    
    total_forecast = sum(f['predicted_eggs'] for f in forecast)
    
    if not is_premium:
        # Return blurred preview for free users
        return {
            "is_premium": False,
            "preview": True,
            "used_fallback": False,
            "forecast": {
                "message": "🔒 Din 7-dagars prognos är klar! Uppgradera till Premium för att se den.",
                "blurred_preview": f"Förväntat antal ägg nästa vecka: ~{total_forecast} ägg baserat på historik.",
                "avg_daily": round(avg_daily, 1),
                "hen_count": hens,
                "days_of_data": days_with_data
            }
        }
    
    return {
        "is_premium": True,
        "preview": False,
        "used_fallback": False,
        "forecast": {
            "daily_predictions": forecast,
            "total_predicted": total_forecast,
            "avg_daily": round(avg_daily, 1),
            "hen_count": hens,
            "days_of_data": days_with_data,
            "generated_at": now_stockholm().isoformat(),
            # New insight fields
            "insights": {
                "trend_last_7_days": trend_direction,
                "trend_percentage": round(trend_pct, 1),
                "best_day_of_week": best_day_of_week,
                "data_quality": data_quality,
                "data_quality_label": "Bra" if data_quality >= 70 else ("Medel" if data_quality >= 40 else "Låg")
            }
        }
    }


@api_router.post("/ai/advisor")
async def get_ai_advisor(request: Request):
    """AI Hönsgårdsrådgivare 'Agda' - Premium only
    Gives personalized advice based on user's flock and question"""
    user_id = await require_user_id(request)
    
    # Get question from body
    try:
        body = await request.json()
        question = body.get('question', '')
    except:
        question = ''
    
    # Check premium status
    subscription = await db.subscriptions.find_one({"user_id": user_id})
    is_premium = subscription.get('is_active', False) if subscription else False
    
    if not is_premium:
        return {
            "is_premium": False,
            "preview": True,
            "used_fallback": False,
            "response": "🔒 AI-rådgivaren Agda är en Premium-funktion. Uppgradera för personliga råd om dina höns!"
        }
    
    # Get user's flock data
    hens = await db.hens.find({"user_id": user_id, "is_active": True}, {"_id": 0}).to_list(100)
    hen_count = len([h for h in hens if h.get('hen_type', 'hen') == 'hen'])
    rooster_count = len([h for h in hens if h.get('hen_type') == 'rooster'])
    
    # Get recent eggs using Stockholm time
    week_ago = days_ago_stockholm(7)
    recent_eggs = await db.egg_records.find({"user_id": user_id, "date": {"$gte": week_ago}}).to_list(1000)
    weekly_total = sum(e.get('count', 0) for e in recent_eggs)
    
    # Get recent health logs
    health_logs = await db.health_logs.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("date", -1).limit(10).to_list(10)
    
    # Get user info
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    user_name = user.get("name", "").split()[0] if user and user.get("name") else ""
    
    try:
        if not EMERGENT_LLM_KEY:
            raise ValueError("EMERGENT_LLM_KEY not configured")
            
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"advisor-{user_id}",
            system_message=f"""{HONSGARD_KNOWLEDGE}

Du pratar med {user_name if user_name else 'en hönsägare'}.
Deras flock: {hen_count} höns och {rooster_count} tuppar.
Ägg senaste veckan: {weekly_total}
Senaste hälsonoteringar: {len(health_logs)} st

Ge konkreta, personliga råd baserat på deras situation.
Svara på svenska, var vänlig men professionell.
Om frågan är oklar, ge generella tips om hönsskötsel."""
        ).with_model("openai", "gpt-4o")
        
        prompt = question if question else "Ge mig några tips för min hönsgård baserat på min nuvarande situation."
        
        message = UserMessage(text=prompt)
        ai_response = await chat.send_message(message)
        
        logger.info(f"AI advisor responded successfully for user {user_id}")
        
        return {
            "is_premium": True,
            "preview": False,
            "used_fallback": False,
            "ai_provider_ok": True,
            "response": ai_response,
            "context": {
                "hen_count": hen_count,
                "rooster_count": rooster_count,
                "weekly_eggs": weekly_total
            }
        }
    except Exception as e:
        logger.error(f"AI advisor failed for user {user_id}: {e}")
        return {
            "is_premium": True,
            "preview": False,
            "used_fallback": True,
            "ai_provider_ok": False,
            "response": "Agda kunde inte svara just nu. Försök igen om en stund!",
            "error": True
        }


@api_router.get("/weather")
async def get_weather(request: Request, lat: float = 59.33, lon: float = 18.07):
    """Get weather data and hen-care tips based on weather
    Default coordinates are for Stockholm
    Uses Open-Meteo API (free, no API key required)"""
    user_id = await require_user_id(request)
    
    # Try to get user's saved location
    user_prefs = await db.user_preferences.find_one({"user_id": user_id}, {"_id": 0})
    if user_prefs:
        lat = user_prefs.get('latitude', lat)
        lon = user_prefs.get('longitude', lon)
    
    weather_data = {
        "current": None,
        "tips": [],
        "source": "default",
        "temperature": None,
        "humidity": None,
        "wind_speed": None,
        "description": ""
    }
    
    # Use Open-Meteo API (free, no API key required)
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api.open-meteo.com/v1/forecast",
                params={
                    "latitude": lat,
                    "longitude": lon,
                    "current": "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,apparent_temperature",
                    "timezone": "Europe/Stockholm"
                },
                timeout=5.0
            )
            if response.status_code == 200:
                data = response.json()
                current = data.get("current", {})
                
                # Map WMO weather codes to Swedish descriptions
                weather_code = current.get("weather_code", 0)
                weather_descriptions = {
                    0: "Klart",
                    1: "Mestadels klart",
                    2: "Delvis molnigt",
                    3: "Molnigt",
                    45: "Dimma",
                    48: "Dimma med rimfrost",
                    51: "Lätt duggregn",
                    53: "Måttligt duggregn",
                    55: "Kraftigt duggregn",
                    61: "Lätt regn",
                    63: "Måttligt regn",
                    65: "Kraftigt regn",
                    71: "Lätt snöfall",
                    73: "Måttligt snöfall",
                    75: "Kraftigt snöfall",
                    77: "Snökorn",
                    80: "Lätta regnskurar",
                    81: "Måttliga regnskurar",
                    82: "Kraftiga regnskurar",
                    85: "Lätta snöbyar",
                    86: "Kraftiga snöbyar",
                    95: "Åskväder",
                    96: "Åskväder med hagel",
                    99: "Kraftigt åskväder med hagel"
                }
                description = weather_descriptions.get(weather_code, "Okänt väder")
                
                temp = current.get("temperature_2m")
                humidity = current.get("relative_humidity_2m")
                wind_speed_kmh = current.get("wind_speed_10m")
                # Convert km/h to m/s (divide by 3.6)
                wind_speed = round(wind_speed_kmh / 3.6, 1) if wind_speed_kmh else None
                feels_like = current.get("apparent_temperature")
                
                weather_data["current"] = {
                    "temp": temp,
                    "feels_like": feels_like,
                    "humidity": humidity,
                    "description": description,
                    "weather_code": weather_code,
                    "wind_speed": wind_speed
                }
                # Also set top-level for easier frontend access
                weather_data["temperature"] = temp
                weather_data["humidity"] = humidity
                weather_data["wind_speed"] = wind_speed
                weather_data["description"] = description
                weather_data["source"] = "open-meteo"
    except Exception as e:
        logging.warning(f"Open-Meteo Weather API failed: {e}")
    
    # Generate tips based on weather
    tips = []
    if weather_data["current"]:
        temp = weather_data["current"]["temp"]
        humidity = weather_data["current"]["humidity"]
        
        # Temperature-based tips
        if temp < 0:
            tips.append({
                "type": "cold",
                "priority": "high",
                "message": "🥶 Minusgrader! Kontrollera att vattnet inte fryser och ge extra foder."
            })
        elif temp < 5:
            tips.append({
                "type": "cold",
                "priority": "medium",
                "message": "❄️ Kallt ute. Säkerställ att hönshuset är dragfritt men ventilerat."
            })
        elif temp > 25:
            tips.append({
                "type": "heat",
                "priority": "high",
                "message": "🌡️ Varmt! Se till att hönsen har skugga och extra vatten."
            })
        elif temp > 30:
            tips.append({
                "type": "heat",
                "priority": "urgent",
                "message": "🔥 Extrem värme! Höns kan dö av värmeslag. Kyla, vatten, skugga!"
            })
        
        # Humidity tips
        if humidity > 80:
            tips.append({
                "type": "humidity",
                "priority": "medium",
                "message": "💧 Hög luftfuktighet. Kontrollera ventilationen i hönshuset."
            })
        
        # Seasonal tip
        month = datetime.now().month
        if month in [11, 12, 1, 2]:
            tips.append({
                "type": "seasonal",
                "priority": "info",
                "message": "💡 Vintertid! Överväg extra belysning (14-16 timmar) för att upprätthålla äggproduktionen."
            })
    else:
        # Default tips without weather data
        tips.append({
            "type": "general",
            "priority": "info",
            "message": "Lägg till din plats i inställningarna för personliga vädertips!"
        })
    
    weather_data["tips"] = tips
    
    return weather_data



# ============ DAGENS TIPS - AGDA ============
DAILY_TIPS_POOL = [
    # ALLMÄNNA TIPS
    {"category": "general", "tip": "Färska ägg sjunker i vatten. Ett enkelt test för att kolla hållbarheten!", "season": None},
    {"category": "general", "tip": "Snäckskal vid sidan av fodret ger hönsen möjlighet att själva reglera sitt kalkintag.", "season": None},
    {"category": "general", "tip": "En höna dricker 2-3 dl vatten per dag. Dubbelt så mycket vid värme!", "season": None},
    {"category": "general", "tip": "Sandbad hjälper hönsen att hålla sig fria från parasiter – och de älskar det!", "season": None},
    {"category": "general", "tip": "Ett välskött hönshus luktar trä och halm – inte ammoniak. Dags att städa?", "season": None},
    {"category": "general", "tip": "Nya höns? Alltid 3 veckors karantän innan de släpps in i flocken.", "season": None},
    {"category": "general", "tip": "Tvätta aldrig ägg i onödan – det naturliga skyddsskiktet är viktigt för hållbarheten.", "season": None},
    {"category": "general", "tip": "En stressad höna värper sämre. Lugn och rutiner är nyckeln!", "season": None},
    {"category": "general", "tip": "Hönsgödsel är guld för trädgården – men låt den kompostera först.", "season": None},
    {"category": "general", "tip": "Reden ska vara mörka och lägre än sittpinnarna – annars sover hönsen där.", "season": None},
    
    # VINTERTIPS (dec, jan, feb)
    {"category": "winter", "tip": "Minusgrader? Lite extra spannmål på kvällen hjälper hönsen hålla värmen över natten.", "season": [12, 1, 2]},
    {"category": "winter", "tip": "Kontrollera vattnet dagligen – en enda dag utan vatten påverkar produktionen i flera dagar.", "season": [12, 1, 2]},
    {"category": "winter", "tip": "14-16 timmars ljus hjälper produktionen, men överdriv inte – hönsen behöver vila.", "season": [12, 1, 2]},
    {"category": "winter", "tip": "Dragfritt men ventilerat – kondens är farligare än kyla för dina höns.", "season": [12, 1, 2]},
    {"category": "winter", "tip": "Frostrisk? Kontrollera kammar och haklapp – de kan få frostskador.", "season": [12, 1, 2]},
    
    # VÅRTIPS (mar, apr, maj)
    {"category": "spring", "tip": "Våren är perfekt för en ordentlig storstädning av hönshuset!", "season": [3, 4, 5]},
    {"category": "spring", "tip": "Ökande dagsljus = ökande produktion. Njut av fler ägg!", "season": [3, 4, 5]},
    {"category": "spring", "tip": "Perfekt tid att kolla över rovdjursskyddet innan sommaren.", "season": [3, 4, 5]},
    {"category": "spring", "tip": "Vårruggning kan förekomma. Lite protein-boost hjälper nya fjädrar.", "season": [3, 4, 5]},
    
    # SOMMARTIPS (jun, jul, aug)
    {"category": "summer", "tip": "Värmestress? Höns flåsar – de svettas inte. Skugga och vatten är livsviktigt!", "season": [6, 7, 8]},
    {"category": "summer", "tip": "Kall frukt som vattenmelon är ett uppskattat godis på varma dagar.", "season": [6, 7, 8]},
    {"category": "summer", "tip": "Fler vattenstationer vid värme – ingen höna ska behöva vänta på att dricka.", "season": [6, 7, 8]},
    {"category": "summer", "tip": "Undvik att störa hönsen under de varmaste timmarna mitt på dagen.", "season": [6, 7, 8]},
    {"category": "summer", "tip": "Insekter, mask och grönt gör sommarägg extra goda!", "season": [6, 7, 8]},
    
    # HÖSTTIPS (sep, okt, nov)
    {"category": "autumn", "tip": "Ruggningssäsong! Minskad produktion är naturligt nu. Informera dina kunder.", "season": [9, 10, 11]},
    {"category": "autumn", "tip": "Extra protein under ruggningen hjälper nya fjädrar att växa snabbare.", "season": [9, 10, 11]},
    {"category": "autumn", "tip": "Perfekt tid att förbereda hönshuset för vintern.", "season": [9, 10, 11]},
    {"category": "autumn", "tip": "Kontrollera att det inte finns springor där kvalster kan gömma sig över vintern.", "season": [9, 10, 11]},
    
    # PRODUKTIONSTIPS
    {"category": "production", "tip": "Under 70% produktivitet? Kolla ljus, foder, stress och hönsens ålder.", "season": None},
    {"category": "production", "tip": "En höna värper som mest under sina första 2-3 år.", "season": None},
    {"category": "production", "tip": "Blandade raser ger blandade ägg – kunder älskar variation!", "season": None},
    {"category": "production", "tip": "Maran ger chokladbruna ägg, Araucana ger blågröna. Perfekt för merförsäljning!", "season": None},
    
    # EKONOMITIPS
    {"category": "economy", "tip": "Håll koll på foderkostnad per ägg för att förstå din lönsamhet.", "season": None},
    {"category": "economy", "tip": "Direktförsäljning ger bättre pris än att sälja via mellanhänder.", "season": None},
    {"category": "economy", "tip": "Märk äggkartongerna med värpdatum – det signalerar kvalitet.", "season": None},
    {"category": "economy", "tip": "Ekologiska och färgglada ägg kan motivera högre pris.", "season": None},
]

@api_router.get("/ai/daily-tip")
async def get_daily_tip(request: Request):
    """Get today's tip from Agda based on season, weather and flock data"""
    user_id = await require_user_id(request)
    
    # Get current context using Stockholm time
    current_month = now_stockholm().month
    today = today_str_stockholm()
    
    # Filter tips by season
    relevant_tips = []
    for tip_data in DAILY_TIPS_POOL:
        if tip_data["season"] is None or current_month in tip_data["season"]:
            relevant_tips.append(tip_data)
    
    # Use date as seed for consistent daily tip
    import hashlib
    seed = int(hashlib.md5(f"{user_id}-{today}".encode()).hexdigest()[:8], 16)
    tip_index = seed % len(relevant_tips)
    selected_tip = relevant_tips[tip_index]
    
    # Get weather for contextual addition
    weather_tip = None
    try:
        weather = await db.weather_cache.find_one(
            {"user_id": user_id, "cached_at": {"$gte": datetime.now(timezone.utc) - timedelta(hours=3)}},
            {"_id": 0}
        )
        if weather and weather.get("data"):
            temp = weather["data"].get("temperature") or weather["data"].get("temp")
            if temp:
                if temp < 0:
                    weather_tip = "🥶 Minusgrader idag! Extra viktigt med vattenkollar."
                elif temp > 25:
                    weather_tip = "🌡️ Varmt idag! Se till att alla har tillgång till skugga och vatten."
    except:
        pass
    
    return {
        "date": today,
        "tip": selected_tip["tip"],
        "category": selected_tip["category"],
        "weather_tip": weather_tip,
        "signature": "💛 Kacklande hälsningar, Agda 🐔",
        "used_fallback": False  # Daily tips are pre-defined, not AI-generated
    }


# Free tip endpoint for non-premium users (teaser)
FREE_TIPS = [
    "Visste du att höns behöver 14-16 timmar ljus per dygn för optimal värpning? Under vintern kan artificiell belysning hjälpa.",
    "Kalcium är avgörande för hönornas äggproduktion! Ge alltid fri tillgång till ostronskalskal eller krossad kalksten.",
    "En värphöna dricker 200-500 ml vatten per dag. Rent, svalt vatten är nyckeln till bra äggproduktion!",
    "Höns älskar stoftbad! Det är deras naturliga sätt att hålla parasiter borta. Ge dem tillgång till torr sand eller jord.",
    "En höna som sitter hopkurad med slutna ögon mitt på dagen mår inte bra. Agera samma dag - isolera och observera!",
    "Ruggningen på hösten är helt naturlig. Ge extra protein (solrosfrön, insekter) så går den snabbare.",
    "En tupp kan ta hand om 8-12 hönor. För många eller för få kan skapa stress i flocken.",
    "Kontrollera alltid hönshuset för kvalster på kvällen - de gömmer sig i springor dagtid och suger blod nattetid.",
]

@api_router.get("/ai/free-tip")
async def get_free_tip(request: Request):
    """Get a free teaser tip for non-premium users"""
    import hashlib
    import random
    
    # Use current hour as part of seed for some variation
    today = today_str_stockholm()
    hour = now_stockholm().hour
    seed = int(hashlib.md5(f"free-{today}-{hour // 4}".encode()).hexdigest()[:8], 16)
    
    tip_index = seed % len(FREE_TIPS)
    
    return {
        "tip": FREE_TIPS[tip_index],
        "is_teaser": True,
        "message": "Uppgradera till Premium för dagliga personliga tips!"
    }


# ============ DAGENS SYSSLA (Daily Chores) ============
DAILY_CHORES = [
    # DAGLIGA RUTINER
    {"id": "water_check", "title": "Kolla vattnet", "description": "Kontrollera att vattenbehållaren är ren och full. Byt om det behövs!", "icon": "💧", "frequency": "daily", "season": None, "priority": 1},
    {"id": "egg_collection", "title": "Hämta ägg", "description": "Samla in ägg minst en gång, gärna två gånger per dag.", "icon": "🥚", "frequency": "daily", "season": None, "priority": 1},
    {"id": "feed_check", "title": "Fyll på foder", "description": "Kontrollera foderautomaten. Se till att alla har tillgång.", "icon": "🌾", "frequency": "daily", "season": None, "priority": 1},
    {"id": "health_check", "title": "Snabbkoll höns", "description": "Titta efter hönor som verkar trötta, har struppigt fjäderskrud eller rör sig konstigt.", "icon": "🔍", "frequency": "daily", "season": None, "priority": 2},
    
    # VECKORUTINER
    {"id": "nest_cleaning", "title": "Rengör reden", "description": "Ta bort smutsigt strö från värpredena och fyll på nytt.", "icon": "🧹", "frequency": "weekly", "season": None, "priority": 2},
    {"id": "bedding_refresh", "title": "Byt ströbädd", "description": "Fräscha upp strömaterialet i hönshuset.", "icon": "🛏️", "frequency": "weekly", "season": None, "priority": 2},
    {"id": "perch_check", "title": "Kolla sittpinnar", "description": "Rengör sittpinnar och kolla efter kvalster.", "icon": "🪵", "frequency": "weekly", "season": None, "priority": 3},
    
    # MÅNADSRUTINER
    {"id": "mite_check", "title": "Kvalsterkontroll", "description": "Gå igenom hönshuset noggrant för kvalster. Kolla springor och skrymslen.", "icon": "🔬", "frequency": "monthly", "season": None, "priority": 2},
    {"id": "predator_check", "title": "Kontrollera rovdjursskydd", "description": "Gå runt och kontrollera stängslet och luckor för hål.", "icon": "🦊", "frequency": "monthly", "season": None, "priority": 3},
    
    # SÄSONGSSPECIFIKA
    {"id": "winter_water", "title": "Frostvakt vatten", "description": "Kolla vattnet flera gånger om dagen - det fryser snabbt!", "icon": "❄️", "frequency": "daily", "season": [12, 1, 2], "priority": 1},
    {"id": "winter_extra_feed", "title": "Kvällsmål", "description": "Ge lite extra spannmål på kvällen för att hålla värmen över natten.", "icon": "🌾", "frequency": "daily", "season": [12, 1, 2], "priority": 2},
    {"id": "winter_light", "title": "Kolla belysning", "description": "14-16 timmar ljus behövs. Kontrollera att lampan fungerar.", "icon": "💡", "frequency": "weekly", "season": [12, 1, 2], "priority": 2},
    {"id": "summer_shade", "title": "Skuggkontroll", "description": "Se till att alla höns har tillgång till skugga och extra vatten.", "icon": "☀️", "frequency": "daily", "season": [6, 7, 8], "priority": 1},
    {"id": "autumn_prep", "title": "Vinterförberedelse", "description": "Täta eventuella springor och förbered för kylan.", "icon": "🍂", "frequency": "monthly", "season": [9, 10, 11], "priority": 2},
    {"id": "spring_cleanup", "title": "Vårstädning", "description": "Dags för ordentlig storstädning av hönshuset efter vintern!", "icon": "🌸", "frequency": "monthly", "season": [3, 4, 5], "priority": 2},
]

@api_router.get("/daily-chores")
async def get_daily_chores(request: Request):
    """Get today's chores based on season and day of week"""
    user_id = await require_user_id(request)
    
    current_month = now_stockholm().month
    current_weekday = now_stockholm().weekday()  # 0 = Monday
    today = today_str_stockholm()
    
    chores = []
    
    # Add all daily tasks
    for chore in DAILY_CHORES:
        # Check season
        if chore["season"] is not None and current_month not in chore["season"]:
            continue
            
        # Add daily tasks
        if chore["frequency"] == "daily":
            chores.append(chore)
        # Add weekly tasks on Sundays
        elif chore["frequency"] == "weekly" and current_weekday == 6:
            chores.append(chore)
        # Add monthly tasks on first day of month
        elif chore["frequency"] == "monthly" and now_stockholm().day == 1:
            chores.append(chore)
    
    # Sort by priority
    chores.sort(key=lambda x: x["priority"])
    
    # Check which chores are already completed today
    completed_today = await db.completed_chores.find(
        {"user_id": user_id, "date": today},
        {"_id": 0, "chore_id": 1}
    ).to_list(100)
    completed_ids = {c["chore_id"] for c in completed_today}
    
    # Add completion status
    for chore in chores:
        chore["completed"] = chore["id"] in completed_ids
    
    return {
        "date": today,
        "chores": chores,
        "completed_count": len(completed_ids),
        "total_count": len(chores)
    }

@api_router.post("/daily-chores/{chore_id}/complete")
async def complete_chore(request: Request, chore_id: str):
    """Mark a chore as completed"""
    user_id = await require_user_id(request)
    today = today_str_stockholm()
    
    # Upsert completion record
    await db.completed_chores.update_one(
        {"user_id": user_id, "chore_id": chore_id, "date": today},
        {"$set": {
            "user_id": user_id,
            "chore_id": chore_id,
            "date": today,
            "completed_at": datetime.now(timezone.utc)
        }},
        upsert=True
    )
    
    return {"success": True, "chore_id": chore_id, "date": today}

@api_router.delete("/daily-chores/{chore_id}/complete")
async def uncomplete_chore(request: Request, chore_id: str):
    """Unmark a chore as completed"""
    user_id = await require_user_id(request)
    today = today_str_stockholm()
    
    await db.completed_chores.delete_one({
        "user_id": user_id,
        "chore_id": chore_id,
        "date": today
    })
    
    return {"success": True, "chore_id": chore_id, "date": today}


# ============ SMART NOTIFICATIONS DATA ============
@api_router.get("/notifications/smart-check")
async def check_smart_notifications(request: Request):
    """Check user's data and return notification triggers
    Frontend will use this to send local push notifications"""
    user_id = await require_user_id(request)
    today = today_str_stockholm()
    
    result = {
        "should_notify": False,
        "notification_type": None,
        "notification_data": {},
        "stats": {}
    }
    
    try:
        # Get today's eggs
        today_eggs = await db.eggs.find({"user_id": user_id, "date": today}).to_list(100)
        today_count = sum(e.get("count", 1) for e in today_eggs)
        
        # Get yesterday's eggs
        yesterday = (now_stockholm() - timedelta(days=1)).strftime('%Y-%m-%d')
        yesterday_eggs = await db.eggs.find({"user_id": user_id, "date": yesterday}).to_list(100)
        yesterday_count = sum(e.get("count", 1) for e in yesterday_eggs)
        
        # Get this week's average
        week_ago = (now_stockholm() - timedelta(days=7)).strftime('%Y-%m-%d')
        this_week_eggs = await db.eggs.find({
            "user_id": user_id,
            "date": {"$gte": week_ago}
        }).to_list(500)
        week_total = sum(e.get("count", 1) for e in this_week_eggs)
        week_average = week_total / 7 if this_week_eggs else 0
        
        # Get last week's average
        two_weeks_ago = (now_stockholm() - timedelta(days=14)).strftime('%Y-%m-%d')
        last_week_eggs = await db.eggs.find({
            "user_id": user_id,
            "date": {"$gte": two_weeks_ago, "$lt": week_ago}
        }).to_list(500)
        last_week_total = sum(e.get("count", 1) for e in last_week_eggs)
        last_week_average = last_week_total / 7 if last_week_eggs else 0
        
        # Get total eggs ever
        all_eggs = await db.eggs.find({"user_id": user_id}).to_list(10000)
        total_eggs = sum(e.get("count", 1) for e in all_eggs)
        
        # Get hen count
        coop = await db.coops.find_one({"user_id": user_id}, {"_id": 0})
        hen_count = coop.get("hen_count", 0) if coop else 0
        
        # Get user's record
        user_stats = await db.user_stats.find_one({"user_id": user_id}, {"_id": 0})
        egg_record = user_stats.get("egg_record", 0) if user_stats else 0
        
        # Check for new record
        new_record = today_count > egg_record and today_count > 0
        if new_record:
            await db.user_stats.update_one(
                {"user_id": user_id},
                {"$set": {"egg_record": today_count, "record_date": today}},
                upsert=True
            )
        
        # Build stats
        result["stats"] = {
            "today_eggs": today_count,
            "yesterday_eggs": yesterday_count,
            "week_average": round(week_average, 1),
            "last_week_average": round(last_week_average, 1),
            "total_eggs": total_eggs,
            "hen_count": hen_count,
            "new_record": new_record,
            "egg_record": max(egg_record, today_count)
        }
        
        # Determine notification to send
        # Priority order: Record > Perfect Day > Milestone > Trend > Encouragement
        
        # 1. New record
        if new_record:
            result["should_notify"] = True
            result["notification_type"] = "new_record"
            result["notification_data"] = {"egg_count": today_count}
            return result
        
        # 2. Perfect day (all hens laid)
        if hen_count > 0 and today_count >= hen_count:
            result["should_notify"] = True
            result["notification_type"] = "perfect_day"
            result["notification_data"] = {"egg_count": today_count, "hen_count": hen_count}
            return result
        
        # 3. First egg ever
        if total_eggs == today_count and today_count > 0:
            result["should_notify"] = True
            result["notification_type"] = "first_egg"
            return result
        
        # 4. Milestones
        milestones = [10, 50, 100, 250, 500, 1000, 2500, 5000, 10000]
        for milestone in milestones:
            if total_eggs >= milestone and total_eggs - today_count < milestone:
                result["should_notify"] = True
                result["notification_type"] = "milestone"
                result["notification_data"] = {"count": milestone}
                return result
        
        # 5. Production trends (only check if we have enough data)
        if last_week_average > 0 and week_average > 0:
            percent_change = ((week_average - last_week_average) / last_week_average) * 100
            
            if percent_change >= 15:
                result["should_notify"] = True
                result["notification_type"] = "production_up"
                result["notification_data"] = {"percent": round(percent_change)}
                return result
            elif percent_change <= -20:
                result["should_notify"] = True
                result["notification_type"] = "production_down"
                result["notification_data"] = {"percent": round(abs(percent_change))}
                return result
        
        # 6. Random encouragement (5% chance)
        import random
        if random.random() < 0.05 and today_count > 0:
            result["should_notify"] = True
            result["notification_type"] = "encouragement"
            return result
            
    except Exception as e:
        logging.error(f"Error checking smart notifications: {e}")
    
    return result


@api_router.get("/recommendations")
async def get_product_recommendations(request: Request):
    """Get personalized product recommendations based on user's flock data"""
    user = await get_current_user(request)
    user_id = user.user_id if user else None
    
    # Determine current conditions
    current_month = now_stockholm().month
    conditions = []
    
    # Season-based conditions
    if current_month in [11, 12, 1, 2]:
        conditions.append("winter")
        conditions.append("cold")
    elif current_month in [6, 7, 8]:
        conditions.append("summer")
    
    # User-specific conditions (if logged in)
    if user_id:
        try:
            # Check recent egg production
            week_ago = (now_stockholm() - timedelta(days=7)).strftime('%Y-%m-%d')
            recent_eggs = await db.eggs.find({
                "user_id": user_id,
                "date": {"$gte": week_ago}
            }).to_list(100)
            
            coop = await db.coops.find_one({"user_id": user_id}, {"_id": 0})
            hen_count = coop.get("hen_count", 5) if coop else 5
            
            # Calculate productivity
            total_eggs = sum(e.get("count", 0) for e in recent_eggs)
            expected_eggs = hen_count * 7 * 0.7  # 70% expected
            
            if total_eggs < expected_eggs * 0.5:
                conditions.append("low_eggs")
        except:
            pass
    
    # Filter and sort recommendations
    recommendations = []
    for product in PRODUCT_RECOMMENDATIONS:
        # Check if product matches any condition
        matches = any(cond in product.get("trigger_conditions", []) for cond in conditions)
        
        # Include product if it matches or has no specific conditions
        if matches or not product.get("trigger_conditions"):
            rec = product.copy()
            rec["relevance_score"] = sum(1 for cond in conditions if cond in product.get("trigger_conditions", []))
            recommendations.append(rec)
    
    # Sort by relevance and priority
    recommendations.sort(key=lambda x: (-x.get("relevance_score", 0), -x.get("priority", 1)))
    
    return {
        "recommendations": recommendations[:5],  # Top 5 recommendations
        "conditions_detected": conditions,
        "affiliate_partner": "bonden.se",
        "note": "Produktrekommendationer baserade på din hönsgårds data och säsong"
    }



@api_router.put("/user-preferences/location")
async def update_user_location(request: Request, lat: float, lon: float, location_name: str = ""):
    """Update user's location for weather data"""
    user_id = await require_user_id(request)
    
    await db.user_preferences.update_one(
        {"user_id": user_id},
        {"$set": {
            "latitude": lat,
            "longitude": lon,
            "location_name": location_name,
            "updated_at": datetime.now(timezone.utc)
        }},
        upsert=True
    )
    
    return {"message": "Plats uppdaterad", "lat": lat, "lon": lon, "location_name": location_name}


@api_router.get("/flock/statistics")
async def get_flock_statistics(request: Request):
    """Get statistics about the flock including hen/rooster ratio"""
    user_id = await require_user_id(request)
    
    all_poultry = await db.hens.find({"user_id": user_id, "is_active": True}, {"_id": 0}).to_list(200)
    
    hens = [p for p in all_poultry if p.get('hen_type', 'hen') == 'hen']
    roosters = [p for p in all_poultry if p.get('hen_type') == 'rooster']
    
    # Calculate ideal ratio
    hen_count = len(hens)
    rooster_count = len(roosters)
    
    # Recommendations
    recommendations = []
    
    if rooster_count == 0 and hen_count > 0:
        recommendations.append({
            "type": "info",
            "message": "Du har ingen tupp. En tupp kan hjälpa till att hålla ordning i flocken och varna för rovdjur."
        })
    elif rooster_count > 0 and hen_count > 0:
        ratio = hen_count / rooster_count
        if ratio < 8:
            recommendations.append({
                "type": "warning",
                "message": f"Du har {rooster_count} tupp(ar) på {hen_count} höns. Rekommenderat är 8-12 höns per tupp. För få höns kan leda till övermattning och stress."
            })
        elif ratio > 12:
            recommendations.append({
                "type": "info",
                "message": f"Du har {rooster_count} tupp(ar) på {hen_count} höns. Du skulle kunna ha ytterligare en tupp om du vill."
            })
        else:
            recommendations.append({
                "type": "success",
                "message": f"Bra balans! {rooster_count} tupp(ar) på {hen_count} höns är inom rekommenderat intervall."
            })
    
    if rooster_count > 1:
        recommendations.append({
            "type": "warning",
            "message": f"Med {rooster_count} tuppar, se upp för slagsmål. Separera dem om de bråkar."
        })
    
    return {
        "total": len(all_poultry),
        "hens": hen_count,
        "roosters": rooster_count,
        "ratio": round(hen_count / rooster_count, 1) if rooster_count > 0 else None,
        "recommendations": recommendations,
        "by_breed": {},  # Could be expanded
        "by_flock": {}   # Could be expanded
    }

# ============ COMMUNITY ENDPOINTS ============

@api_router.get("/community/posts")
async def get_community_posts(
    request: Request, 
    category: Optional[str] = None,
    limit: int = 50,
    offset: int = 0
):
    """Get community posts feed - available for all users"""
    user = await get_current_user(request)
    user_id = user.user_id if user else None
    
    # Build query
    query = {"is_hidden": False}
    if category and category != "all":
        query["category"] = category
    
    # Get posts sorted by newest first
    posts = await db.community_posts.find(
        query, 
        {"_id": 0}
    ).sort("created_at", -1).skip(offset).limit(limit).to_list(limit)
    
    # Format posts for response
    formatted_posts = []
    for post in posts:
        formatted_posts.append({
            "id": post["id"],
            "user_name": post.get("user_name", "Anonym"),
            "content": post["content"],
            "category": post.get("category", "other"),
            "category_label": CATEGORY_LABELS.get(post.get("category", "other"), {}).get("sv", "Övrigt"),
            "created_at": post["created_at"].isoformat() if isinstance(post["created_at"], datetime) else post["created_at"],
            "likes": post.get("likes", 0),
            "liked_by_me": user_id in post.get("liked_by", []) if user_id else False,
            "is_mine": post.get("user_id") == user_id if user_id else False,
            "coop_stats": post.get("coop_stats"),  # Include coop stats if present
            "is_sponsored": False,
        })
    
    # Get a relevant sponsored post to inject (max 1 per feed load)
    sponsored_post = await get_relevant_sponsored_post(category)
    if sponsored_post and offset == 0:  # Only inject on first page
        # Insert sponsored post at position 2-3 in the feed
        insert_position = min(2, len(formatted_posts))
        formatted_posts.insert(insert_position, sponsored_post)
    
    total = await db.community_posts.count_documents(query)
    
    return {
        "posts": formatted_posts,
        "total": total,
        "limit": limit,
        "offset": offset,
        "categories": [
            {"value": "all", "label": "📋 Alla"},
            {"value": "eggs", "label": "🥚 Äggproduktion"},
            {"value": "health", "label": "🐔 Hälsa & Sjukdom"},
            {"value": "housing", "label": "🏠 Hönshus & Utrustning"},
            {"value": "feed", "label": "🍽️ Foder"},
            {"value": "other", "label": "❓ Övrigt"},
        ]
    }


async def get_relevant_sponsored_post(category: Optional[str] = None) -> Optional[dict]:
    """Get a relevant sponsored post based on season/conditions"""
    import hashlib
    
    # Determine current conditions
    current_month = now_stockholm().month
    conditions = ["always"]
    
    if current_month in [11, 12, 1, 2]:
        conditions.append("winter")
    elif current_month in [6, 7, 8]:
        conditions.append("summer")
    elif current_month in [3, 4, 5]:
        conditions.append("spring")
    else:
        conditions.append("autumn")
    
    # Get today's date for consistent selection
    today = today_str_stockholm()
    
    # Try to get sponsored posts from DB first
    db_sponsored = await db.sponsored_posts.find(
        {"is_active": True},
        {"_id": 0}
    ).to_list(50)
    
    # Combine with default posts if DB is empty
    all_sponsored = db_sponsored if db_sponsored else DEFAULT_SPONSORED_POSTS
    
    # Filter by date range and conditions
    valid_posts = []
    for post in all_sponsored:
        # Check date range
        if post.get("start_date") and post["start_date"] > today:
            continue
        if post.get("end_date") and post["end_date"] < today:
            continue
        
        # Check if any condition matches
        post_conditions = post.get("trigger_conditions", ["always"])
        if any(cond in post_conditions for cond in conditions):
            valid_posts.append(post)
        
        # Also include if category matches
        if category and post.get("category") == category:
            valid_posts.append(post)
    
    # Remove duplicates
    seen_ids = set()
    unique_posts = []
    for post in valid_posts:
        if post["id"] not in seen_ids:
            seen_ids.add(post["id"])
            unique_posts.append(post)
    
    if not unique_posts:
        return None
    
    # Sort by priority and select one (consistent per day)
    unique_posts.sort(key=lambda x: -x.get("priority", 1))
    
    # Use date as seed for consistent daily selection
    seed = int(hashlib.md5(f"sponsor-{today}".encode()).hexdigest()[:8], 16)
    selected = unique_posts[seed % len(unique_posts)]
    
    # Track impression
    if selected.get("id"):
        await db.sponsored_posts.update_one(
            {"id": selected["id"]},
            {"$inc": {"impressions": 1}},
            upsert=False
        )
    
    # Format as community post
    return {
        "id": f"sponsored-{selected['id']}",
        "user_name": "🎁 Agdas Tips",
        "content": selected.get("content", ""),
        "title": selected.get("title"),
        "category": selected.get("category", "other"),
        "category_label": CATEGORY_LABELS.get(selected.get("category", "other"), {}).get("sv", "Tips"),
        "created_at": now_stockholm().isoformat(),
        "likes": 0,
        "liked_by_me": False,
        "is_mine": False,
        "is_sponsored": True,
        "affiliate_url": selected.get("affiliate_url"),
        "discount_code": selected.get("discount_code"),
        "discount_percent": selected.get("discount_percent"),
        "image_url": selected.get("image_url"),
    }


@api_router.post("/community/posts")
async def create_community_post(request: Request, post_data: CommunityPostCreate):
    """Create a new community post - requires login"""
    user_id = await require_user_id(request)
    
    # Get user info
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Användare hittades inte")
    
    # Check rate limiting for free users
    subscription = await db.subscriptions.find_one(
        {"user_id": user_id, "status": "active", "expires_at": {"$gt": datetime.now(timezone.utc)}},
        {"_id": 0}
    )
    is_premium = subscription is not None
    
    if not is_premium:
        # Free users: max 3 posts per day
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        posts_today = await db.community_posts.count_documents({
            "user_id": user_id,
            "created_at": {"$gte": today_start}
        })
        if posts_today >= 3:
            raise HTTPException(
                status_code=429, 
                detail="Som gratismedlem kan du skriva max 3 inlägg per dag. Uppgradera till Premium för obegränsade inlägg!"
            )
    
    # Content moderation
    is_ok, reason = check_forbidden_content(post_data.content)
    if not is_ok:
        raise HTTPException(status_code=400, detail=reason)
    
    # Content length check
    if len(post_data.content) < 10:
        raise HTTPException(status_code=400, detail="Inlägget måste vara minst 10 tecken")
    if len(post_data.content) > 1000:
        raise HTTPException(status_code=400, detail="Inlägget får vara max 1000 tecken")
    
    # Get coop stats if requested
    coop_stats = None
    if post_data.include_stats:
        try:
            coop = await db.coops.find_one({"user_id": user_id}, {"_id": 0})
            if coop:
                # Get eggs from last 7 days
                week_ago = (now_stockholm() - timedelta(days=7)).strftime('%Y-%m-%d')
                recent_eggs = await db.eggs.find({
                    "user_id": user_id,
                    "date": {"$gte": week_ago}
                }).to_list(100)
                
                eggs_this_week = sum(e.get("count", 0) for e in recent_eggs)
                hen_count = coop.get("hen_count", 0)
                avg_per_day = round(eggs_this_week / 7, 1) if eggs_this_week > 0 else 0
                
                # Calculate productivity percentage
                expected_per_week = hen_count * 7 * 0.7  # 70% expected laying rate
                productivity = round((eggs_this_week / expected_per_week) * 100) if expected_per_week > 0 else 0
                
                coop_stats = {
                    "coop_name": coop.get("coop_name", "Min hönsgård"),
                    "hen_count": hen_count,
                    "eggs_this_week": eggs_this_week,
                    "avg_per_day": avg_per_day,
                    "productivity": min(productivity, 150)  # Cap at 150%
                }
        except Exception as e:
            logger.warning(f"Failed to get coop stats: {e}")
    
    # Create post
    post = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "user_name": user.get("name", "Hönsentusiast"),
        "content": post_data.content.strip(),
        "category": post_data.category if post_data.category in ["eggs", "health", "housing", "feed", "other"] else "other",
        "created_at": datetime.now(timezone.utc),
        "likes": 0,
        "liked_by": [],
        "is_hidden": False,
        "hidden_reason": None,
        "coop_stats": coop_stats
    }
    
    await db.community_posts.insert_one(post)
    
    # Return without _id
    post.pop("_id", None)
    post["created_at"] = post["created_at"].isoformat()
    post["category_label"] = CATEGORY_LABELS.get(post["category"], {}).get("sv", "Övrigt")
    post["liked_by_me"] = False
    post["is_mine"] = True
    
    return post


@api_router.post("/community/posts/{post_id}/like")
async def like_community_post(request: Request, post_id: str):
    """Like/unlike a community post"""
    user_id = await require_user_id(request)
    
    post = await db.community_posts.find_one({"id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Inlägget hittades inte")
    
    liked_by = post.get("liked_by", [])
    
    if user_id in liked_by:
        # Unlike
        liked_by.remove(user_id)
        action = "unliked"
    else:
        # Like
        liked_by.append(user_id)
        action = "liked"
    
    await db.community_posts.update_one(
        {"id": post_id},
        {"$set": {"liked_by": liked_by, "likes": len(liked_by)}}
    )
    
    return {"action": action, "likes": len(liked_by)}


@api_router.delete("/community/posts/{post_id}")
async def delete_community_post(request: Request, post_id: str):
    """Delete a community post - only owner or admin"""
    user_id = await require_user_id(request)
    
    post = await db.community_posts.find_one({"id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Inlägget hittades inte")
    
    # Check if user is owner or admin
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    is_admin = user.get("is_admin", False) if user else False
    
    if post["user_id"] != user_id and not is_admin:
        raise HTTPException(status_code=403, detail="Du kan bara radera dina egna inlägg")
    
    await db.community_posts.delete_one({"id": post_id})
    
    return {"message": "Inlägget har raderats"}


@api_router.post("/community/posts/{post_id}/hide")
async def hide_community_post(request: Request, post_id: str, reason: str = "Bryter mot riktlinjerna"):
    """Hide a community post - admin only"""
    user_id = await require_user_id(request)
    
    # Check if admin
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user or not user.get("is_admin", False):
        raise HTTPException(status_code=403, detail="Endast administratörer kan dölja inlägg")
    
    result = await db.community_posts.update_one(
        {"id": post_id},
        {"$set": {"is_hidden": True, "hidden_reason": reason, "hidden_by": user_id, "hidden_at": datetime.now(timezone.utc)}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Inlägget hittades inte")
    
    return {"message": "Inlägget har dolts", "reason": reason}


@api_router.get("/admin/community/posts")
async def admin_get_community_posts(request: Request, include_hidden: bool = True):
    """Get all community posts for admin moderation"""
    user_id = await require_user_id(request)
    
    # Check if admin
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user or not user.get("is_admin", False):
        raise HTTPException(status_code=403, detail="Endast administratörer")
    
    query = {} if include_hidden else {"is_hidden": False}
    posts = await db.community_posts.find(query, {"_id": 0}).sort("created_at", -1).to_list(200)
    
    return {"posts": posts, "total": len(posts)}


# ============ SPONSORED POSTS ADMIN ENDPOINTS ============

@api_router.get("/admin/sponsored")
async def admin_get_sponsored_posts(request: Request):
    """Get all sponsored posts for admin"""
    user_id = await require_user_id(request)
    
    # Check if admin
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user or not user.get("is_admin", False):
        raise HTTPException(status_code=403, detail="Endast administratörer")
    
    # Get from DB
    db_posts = await db.sponsored_posts.find({}, {"_id": 0}).sort("priority", -1).to_list(100)
    
    # If DB is empty, return defaults
    if not db_posts:
        return {"posts": DEFAULT_SPONSORED_POSTS, "source": "default"}
    
    return {"posts": db_posts, "source": "database"}


@api_router.post("/admin/sponsored")
async def admin_create_sponsored_post(request: Request, post_data: SponsoredPostCreate):
    """Create a new sponsored post"""
    user_id = await require_user_id(request)
    
    # Check if admin
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user or not user.get("is_admin", False):
        raise HTTPException(status_code=403, detail="Endast administratörer")
    
    post = {
        "id": str(uuid.uuid4()),
        "title": post_data.title,
        "content": post_data.content,
        "category": post_data.category,
        "affiliate_url": post_data.affiliate_url,
        "discount_code": post_data.discount_code,
        "discount_percent": post_data.discount_percent,
        "image_url": post_data.image_url,
        "trigger_conditions": post_data.trigger_conditions or ["always"],
        "start_date": post_data.start_date,
        "end_date": post_data.end_date,
        "is_active": post_data.is_active,
        "priority": post_data.priority,
        "created_at": datetime.now(timezone.utc),
        "clicks": 0,
        "impressions": 0,
        "created_by": user_id
    }
    
    await db.sponsored_posts.insert_one(post)
    post.pop("_id", None)
    
    return post


@api_router.put("/admin/sponsored/{post_id}")
async def admin_update_sponsored_post(request: Request, post_id: str, post_data: SponsoredPostCreate):
    """Update a sponsored post"""
    user_id = await require_user_id(request)
    
    # Check if admin
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user or not user.get("is_admin", False):
        raise HTTPException(status_code=403, detail="Endast administratörer")
    
    update_data = {
        "title": post_data.title,
        "content": post_data.content,
        "category": post_data.category,
        "affiliate_url": post_data.affiliate_url,
        "discount_code": post_data.discount_code,
        "discount_percent": post_data.discount_percent,
        "image_url": post_data.image_url,
        "trigger_conditions": post_data.trigger_conditions or ["always"],
        "start_date": post_data.start_date,
        "end_date": post_data.end_date,
        "is_active": post_data.is_active,
        "priority": post_data.priority,
        "updated_at": datetime.now(timezone.utc)
    }
    
    result = await db.sponsored_posts.update_one(
        {"id": post_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Sponsrat inlägg hittades inte")
    
    return {"message": "Uppdaterat", "post_id": post_id}


@api_router.delete("/admin/sponsored/{post_id}")
async def admin_delete_sponsored_post(request: Request, post_id: str):
    """Delete a sponsored post"""
    user_id = await require_user_id(request)
    
    # Check if admin
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user or not user.get("is_admin", False):
        raise HTTPException(status_code=403, detail="Endast administratörer")
    
    result = await db.sponsored_posts.delete_one({"id": post_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Sponsrat inlägg hittades inte")
    
    return {"message": "Raderat", "post_id": post_id}


@api_router.post("/community/sponsored/{post_id}/click")
async def track_sponsored_click(request: Request, post_id: str):
    """Track when a user clicks a sponsored post affiliate link"""
    # Remove 'sponsored-' prefix if present
    actual_id = post_id.replace("sponsored-", "")
    
    await db.sponsored_posts.update_one(
        {"id": actual_id},
        {"$inc": {"clicks": 1}}
    )
    
    return {"tracked": True}


@api_router.get("/")
async def root():
    return {"message": "Hönsgården API", "version": "2.0"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy"}

# Serve standalone premium page via API route
@api_router.get("/premium-page", response_class=HTMLResponse)
async def serve_premium_page_api():
    """Serve the standalone premium landing page"""
    premium_file = ROOT_DIR / "webapp_dist" / "premium.html"
    if premium_file.exists():
        with open(premium_file, 'r', encoding='utf-8') as f:
            return HTMLResponse(content=f.read())
    return HTMLResponse(content="<h1>Premium page not found</h1>", status_code=404)

@api_router.get("/checkout/confirm")
async def confirm_checkout_session(session_id: str = Query(...)):
    """
    Confirm a Stripe checkout session and activate premium.
    This is called by the success page to ensure premium is activated
    even if the webhook hasn't arrived yet.
    """
    if not STRIPE_API_KEY:
        return {"ok": False, "error": "Stripe not configured"}
    
    try:
        import stripe
        stripe.api_key = STRIPE_API_KEY
        
        # Retrieve the checkout session with subscription expanded
        session = stripe.checkout.Session.retrieve(
            session_id,
            expand=['subscription', 'customer']
        )
        
        if not session:
            return {"ok": False, "error": "Session not found"}
        
        # Get user_id from metadata
        user_id = session.metadata.get('user_id') if session.metadata else None
        
        if not user_id:
            logger.warning(f"Checkout session {session_id} missing user_id in metadata")
            return {"ok": False, "error": "User not associated with session"}
        
        # Check payment status
        if session.payment_status != 'paid':
            return {"ok": False, "error": "Payment not completed", "status": session.payment_status}
        
        # Determine plan from line items or subscription
        plan = "monthly"
        expires_at = None
        
        if session.subscription:
            sub = session.subscription
            if isinstance(sub, str):
                sub = stripe.Subscription.retrieve(sub)
            
            if sub.items and sub.items.data:
                price_id = sub.items.data[0].price.id
                if price_id == STRIPE_PRICE_YEARLY or "yearly" in price_id.lower() or "annual" in price_id.lower():
                    plan = "yearly"
            
            # Get expiration from subscription
            if sub.current_period_end:
                expires_at = datetime.fromtimestamp(sub.current_period_end, tz=timezone.utc)
        else:
            # Fallback: calculate from plan
            if plan == "yearly":
                expires_at = datetime.now(timezone.utc) + timedelta(days=365)
            else:
                expires_at = datetime.now(timezone.utc) + timedelta(days=30)
        
        # Update subscription in database
        await db.subscriptions.update_one(
            {"user_id": user_id},
            {"$set": {
                "is_active": True,
                "plan": plan,
                "expires_at": expires_at,
                "stripe_subscription_id": session.subscription if isinstance(session.subscription, str) else session.subscription.id if session.subscription else None,
                "stripe_customer_id": session.customer if isinstance(session.customer, str) else session.customer.id if session.customer else None,
                "purchase_source": "stripe_web",
                "confirmed_via": "checkout_confirm",
                "updated_at": datetime.now(timezone.utc)
            }},
            upsert=True
        )
        
        # Log the transaction
        await db.payment_transactions.update_one(
            {"stripe_session_id": session_id},
            {"$set": {
                "status": "paid",
                "confirmed_at": datetime.now(timezone.utc)
            }}
        )
        
        logger.info(f"Checkout confirmed for user {user_id}, plan: {plan}")
        
        return {
            "ok": True,
            "is_premium": True,
            "plan": plan,
            "expires_at": expires_at.isoformat() if expires_at else None
        }
        
    except Exception as e:
        logger.error(f"Checkout confirm error: {e}")
        return {"ok": False, "error": str(e)}


@api_router.get("/checkout-success", response_class=HTMLResponse)
async def serve_checkout_success_page():
    """Serve the checkout success page"""
    success_file = ROOT_DIR / "webapp_dist" / "checkout-success.html"
    if success_file.exists():
        with open(success_file, 'r', encoding='utf-8') as f:
            return HTMLResponse(content=f.read())
    return HTMLResponse(content="<h1>Page not found</h1>", status_code=404)

@api_router.get("/privacy", response_class=HTMLResponse)
async def serve_privacy_page():
    """Serve the privacy policy page"""
    privacy_file = ROOT_DIR / "webapp_dist" / "privacy.html"
    if privacy_file.exists():
        with open(privacy_file, 'r', encoding='utf-8') as f:
            return HTMLResponse(content=f.read())
    return HTMLResponse(content="<h1>Page not found</h1>", status_code=404)

@api_router.get("/terms", response_class=HTMLResponse)
async def serve_terms_page():
    """Serve the terms of service page"""
    terms_file = ROOT_DIR / "webapp_dist" / "terms.html"
    if terms_file.exists():
        with open(terms_file, 'r', encoding='utf-8') as f:
            return HTMLResponse(content=f.read())
    return HTMLResponse(content="<h1>Page not found</h1>", status_code=404)

@api_router.get("/reset-password", response_class=HTMLResponse)
async def serve_reset_password_page():
    """Serve the password reset page"""
    reset_file = ROOT_DIR / "webapp_dist" / "reset-password.html"
    if reset_file.exists():
        with open(reset_file, 'r', encoding='utf-8') as f:
            return HTMLResponse(content=f.read())
    return HTMLResponse(content="<h1>Page not found</h1>", status_code=404)

@api_router.get("/register", response_class=HTMLResponse)
async def serve_register_page():
    """Serve the registration page"""
    register_file = ROOT_DIR / "webapp_dist" / "register.html"
    if register_file.exists():
        with open(register_file, 'r', encoding='utf-8') as f:
            return HTMLResponse(content=f.read())
    return HTMLResponse(content="<h1>Page not found</h1>", status_code=404)

# Include the router in the main app
app.include_router(api_router)

# CORS Configuration - Explicit origins for security
# With credentials=True, we must specify explicit origins (not *)
ALLOWED_ORIGINS = [
    "https://honsgarden.se",
    "https://www.honsgarden.se",
    "http://localhost:3000",
    "http://localhost:8081",
    "http://localhost:19006",
    # Add preview domains for development
    "https://coop-hub-1.preview.emergentagent.com",
]

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============ WEBAPP STATIC FILES ============
# Serve webapp at ROOT (honsgarden.se) and keep /api/web for backwards compatibility
if WEBAPP_DIR.exists():
    # Mount assets folder at root and /api/web for backwards compatibility
    app.mount("/assets", StaticFiles(directory=str(WEBAPP_DIR / "assets")), name="static_assets_root")
    app.mount("/api/web/assets", StaticFiles(directory=str(WEBAPP_DIR / "assets")), name="static_assets_api")
    
    # Serve favicon
    @app.get("/favicon.svg")
    async def favicon_root():
        return FileResponse(str(WEBAPP_DIR / "favicon.svg"))
    
    @app.get("/favicon.ico")
    async def favicon_ico():
        if (WEBAPP_DIR / "favicon.ico").exists():
            return FileResponse(str(WEBAPP_DIR / "favicon.ico"))
        return FileResponse(str(WEBAPP_DIR / "favicon.svg"))
    
    @app.get("/api/web/favicon.svg")
    async def favicon_api():
        return FileResponse(str(WEBAPP_DIR / "favicon.svg"))
    
    # Redirect root to webapp
    @app.get("/")
    async def redirect_to_webapp():
        """Redirect root to React webapp"""
        from fastapi.responses import RedirectResponse
        return RedirectResponse(url="/api/web", status_code=302)
    
    # Serve standalone premium page
    @app.get("/premium")
    async def serve_premium_page():
        """Serve the standalone premium landing page"""
        premium_file = WEBAPP_DIR / "premium.html"
        if premium_file.exists():
            return FileResponse(str(premium_file), media_type="text/html")
        from fastapi.responses import RedirectResponse
        return RedirectResponse(url="/api/web", status_code=302)
    
    @app.get("/login")
    @app.get("/eggs")
    @app.get("/hens")
    @app.get("/finance")
    @app.get("/statistics")
    @app.get("/settings")
    @app.get("/admin")
    @app.get("/checkout-success")
    async def redirect_webapp_routes():
        """Redirect SPA routes to /api/web"""
        from fastapi.responses import RedirectResponse
        return RedirectResponse(url="/api/web", status_code=302)
    
    # Serve webapp at /api/web
    @app.get("/api/web")
    @app.get("/api/web/")
    @app.get("/api/web/{full_path:path}")
    async def serve_webapp_api(request: Request, full_path: str = ""):
        """Serve the React webapp"""
        return FileResponse(str(WEBAPP_DIR / "index.html"), media_type="text/html")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
