import React from 'react';
import { Link } from 'react-router-dom';
import './Legal.css';

export default function Privacy() {
  return (
    <div className="legal-page">
      <div className="legal-container">
        <Link to="/login" className="back-link">← Tillbaka</Link>
        
        <h1>Integritetspolicy</h1>
        <p className="last-updated">Senast uppdaterad: 25 februari 2026</p>
        
        <section>
          <h2>1. Introduktion</h2>
          <p>
            Hönsgården ("vi", "oss", "vår") respekterar din integritet och är engagerade i att skydda 
            dina personuppgifter. Denna integritetspolicy beskriver hur vi samlar in, använder och 
            skyddar dina personuppgifter när du använder vår mobilapp och webbtjänst ("Tjänsten").
          </p>
        </section>

        <section>
          <h2>2. Personuppgiftsansvarig</h2>
          <p>
            Aurora Media AB<br />
            Organisationsnummer: 559XXX-XXXX<br />
            E-post: info@honsgarden.se<br />
            Webbplats: honsgarden.se
          </p>
        </section>

        <section>
          <h2>3. Vilka uppgifter samlar vi in?</h2>
          <h3>3.1 Uppgifter du ger oss</h3>
          <ul>
            <li><strong>Kontouppgifter:</strong> E-postadress, namn, lösenord (krypterat)</li>
            <li><strong>Profiluppgifter:</strong> Namn på din hönsgård, antal hönor</li>
            <li><strong>Användardata:</strong> Äggregistreringar, hönsprofiler, ekonomidata, hälsologgar</li>
          </ul>
          
          <h3>3.2 Uppgifter vi samlar automatiskt</h3>
          <ul>
            <li><strong>Enhetsinfo:</strong> Enhetstyp, operativsystem, app-version</li>
            <li><strong>Användningsdata:</strong> Hur du interagerar med appen</li>
            <li><strong>Platsdata:</strong> Ungefärlig plats för väderfunktionen (endast med ditt samtycke)</li>
          </ul>
          
          <h3>3.3 Uppgifter från tredje part</h3>
          <ul>
            <li><strong>Inloggning via Google/Apple:</strong> Namn, e-post, profilbild</li>
            <li><strong>Betalningar:</strong> RevenueCat (prenumerationsstatus), Stripe (webbköp)</li>
          </ul>
        </section>

        <section>
          <h2>4. Hur använder vi dina uppgifter?</h2>
          <ul>
            <li>Tillhandahålla och förbättra Tjänsten</li>
            <li>Hantera ditt konto och prenumeration</li>
            <li>Skicka viktiga meddelanden om Tjänsten</li>
            <li>Ge dig personliga AI-baserade råd och prognoser</li>
            <li>Tillhandahålla väderbaserade tips (med ditt samtycke)</li>
            <li>Skicka påminnelser (om du aktiverat detta)</li>
            <li>Förbättra och utveckla nya funktioner</li>
            <li>Förhindra missbruk och bedrägerier</li>
          </ul>
        </section>

        <section>
          <h2>5. Rättslig grund för behandling</h2>
          <ul>
            <li><strong>Avtal:</strong> För att tillhandahålla Tjänsten du har registrerat dig för</li>
            <li><strong>Samtycke:</strong> För marknadsföring och platsbaserade funktioner</li>
            <li><strong>Berättigat intresse:</strong> För att förbättra Tjänsten och förhindra missbruk</li>
            <li><strong>Rättslig förpliktelse:</strong> För bokföring och juridiska krav</li>
          </ul>
        </section>

        <section>
          <h2>6. Delning av uppgifter</h2>
          <p>Vi säljer aldrig dina personuppgifter. Vi delar uppgifter endast med:</p>
          <ul>
            <li><strong>Tjänsteleverantörer:</strong> Hosting, betalningar, e-post (under sekretessavtal)</li>
            <li><strong>Myndigheter:</strong> Om det krävs enligt lag</li>
          </ul>
          
          <h3>Våra underleverantörer:</h3>
          <ul>
            <li>MongoDB Atlas (databas) - EU/USA</li>
            <li>RevenueCat (prenumerationer) - USA</li>
            <li>Stripe (betalningar) - USA</li>
            <li>Resend (e-post) - USA</li>
            <li>OpenAI (AI-funktioner) - USA</li>
            <li>OpenWeatherMap (väder) - EU</li>
          </ul>
        </section>

        <section>
          <h2>7. Datalagring och säkerhet</h2>
          <p>
            Vi lagrar dina uppgifter så länge du har ett aktivt konto, plus 30 dagar efter radering 
            för backup-syften. Ekonomiska transaktioner sparas i 7 år enligt bokföringslagen.
          </p>
          <p>
            Vi använder branschstandard säkerhetsåtgärder inklusive kryptering av data i transit (TLS) 
            och i vila, säker lösenordshantering (bcrypt), och regelbundna säkerhetsgranskningar.
          </p>
        </section>

        <section>
          <h2>8. Dina rättigheter (GDPR)</h2>
          <p>Du har rätt att:</p>
          <ul>
            <li><strong>Få tillgång</strong> till dina personuppgifter</li>
            <li><strong>Rätta</strong> felaktiga uppgifter</li>
            <li><strong>Radera</strong> dina uppgifter ("rätten att bli glömd")</li>
            <li><strong>Exportera</strong> dina uppgifter (dataportabilitet)</li>
            <li><strong>Invända</strong> mot viss behandling</li>
            <li><strong>Begränsa</strong> behandlingen</li>
            <li><strong>Återkalla samtycke</strong> när som helst</li>
          </ul>
          <p>
            Kontakta oss på <a href="mailto:info@honsgarden.se">info@honsgarden.se</a> för att utöva 
            dina rättigheter. Vi svarar inom 30 dagar.
          </p>
        </section>

        <section>
          <h2>9. Cookies och spårning</h2>
          <p>
            Vi använder nödvändiga cookies för att hålla dig inloggad. Vi använder inga 
            tredjepartscookies för reklam eller spårning.
          </p>
        </section>

        <section>
          <h2>10. Barn</h2>
          <p>
            Tjänsten är inte avsedd för barn under 16 år. Vi samlar inte medvetet in 
            personuppgifter från barn.
          </p>
        </section>

        <section>
          <h2>11. Ändringar</h2>
          <p>
            Vi kan uppdatera denna policy. Väsentliga ändringar meddelas via e-post eller 
            i appen. Fortsatt användning efter ändringar innebär att du accepterar dem.
          </p>
        </section>

        <section>
          <h2>12. Kontakt och klagomål</h2>
          <p>
            För frågor om integritet, kontakta oss på <a href="mailto:info@honsgarden.se">info@honsgarden.se</a>.
          </p>
          <p>
            Du har rätt att lämna klagomål till Integritetsskyddsmyndigheten (IMY):<br />
            <a href="https://www.imy.se" target="_blank" rel="noopener noreferrer">www.imy.se</a>
          </p>
        </section>
      </div>
    </div>
  );
}
