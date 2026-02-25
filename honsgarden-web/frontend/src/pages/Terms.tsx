import React from 'react';
import { Link } from 'react-router-dom';
import './Legal.css';

export default function Terms() {
  return (
    <div className="legal-page">
      <div className="legal-container">
        <Link to="/login" className="back-link">← Tillbaka</Link>
        
        <h1>Användarvillkor</h1>
        <p className="last-updated">Senast uppdaterad: 25 februari 2026</p>
        
        <section>
          <h2>1. Godkännande av villkor</h2>
          <p>
            Genom att använda Hönsgården-appen och webbtjänsten ("Tjänsten") godkänner du dessa 
            användarvillkor. Om du inte accepterar villkoren, vänligen använd inte Tjänsten.
          </p>
        </section>

        <section>
          <h2>2. Tjänsten</h2>
          <p>
            Hönsgården är en app för hönsgårdsägare som hjälper dig att:
          </p>
          <ul>
            <li>Registrera och följa äggproduktion</li>
            <li>Hantera hönsprofiler och hälsa</li>
            <li>Spåra ekonomi (intäkter och kostnader)</li>
            <li>Få AI-baserade råd och prognoser (Premium)</li>
            <li>Hantera foder och kläckning (Premium)</li>
          </ul>
        </section>

        <section>
          <h2>3. Konto</h2>
          <h3>3.1 Registrering</h3>
          <p>
            Du måste vara minst 16 år för att skapa ett konto. Du ansvarar för att hålla 
            dina inloggningsuppgifter säkra och konfidentiella.
          </p>
          
          <h3>3.2 Kontots säkerhet</h3>
          <p>
            Du ansvarar för all aktivitet som sker under ditt konto. Meddela oss omedelbart 
            vid obehörig användning via <a href="mailto:info@honsgarden.se">info@honsgarden.se</a>.
          </p>
        </section>

        <section>
          <h2>4. Prenumerationer och betalningar</h2>
          <h3>4.1 Gratis version</h3>
          <p>
            Grundfunktioner är gratis att använda med vissa begränsningar (t.ex. 30 dagars historik).
          </p>
          
          <h3>4.2 Premium-prenumeration</h3>
          <p>
            Premium ger tillgång till alla funktioner. Priser visas i appen före köp.
          </p>
          <ul>
            <li><strong>Månadsplan:</strong> Debiteras månadsvis</li>
            <li><strong>Årsplan:</strong> Debiteras årligen (rabatterat)</li>
          </ul>
          
          <h3>4.3 Automatisk förnyelse</h3>
          <p>
            Prenumerationen förnyas automatiskt om den inte avbryts minst 24 timmar innan 
            den aktuella perioden slutar.
          </p>
          
          <h3>4.4 Avbokning</h3>
          <p>
            Du kan avbryta din prenumeration när som helst:
          </p>
          <ul>
            <li><strong>iOS:</strong> Inställningar → Apple-ID → Prenumerationer</li>
            <li><strong>Android:</strong> Google Play → Prenumerationer</li>
            <li><strong>Webb:</strong> Via Stripe kundportal</li>
          </ul>
          <p>
            Vid avbokning har du tillgång till Premium fram till periodens slut.
          </p>
          
          <h3>4.5 Återbetalning</h3>
          <p>
            Återbetalningar hanteras av Apple/Google enligt deras policyer. För webbköp 
            via Stripe, kontakta oss inom 14 dagar för återbetalning.
          </p>
        </section>

        <section>
          <h2>5. Användning av Tjänsten</h2>
          <h3>5.1 Tillåten användning</h3>
          <p>Du får använda Tjänsten för personligt, icke-kommersiellt bruk.</p>
          
          <h3>5.2 Förbjuden användning</h3>
          <p>Du får inte:</p>
          <ul>
            <li>Dela konto med andra</li>
            <li>Försöka hacka eller störa Tjänsten</li>
            <li>Använda automatiserade verktyg för att samla data</li>
            <li>Bryta mot lagar eller andras rättigheter</li>
            <li>Ladda upp skadlig kod eller olämpligt innehåll</li>
          </ul>
        </section>

        <section>
          <h2>6. Immateriella rättigheter</h2>
          <p>
            Tjänsten, inklusive design, kod, logotyper och innehåll, tillhör Aurora Media AB 
            och skyddas av upphovsrätt och andra immaterialrättsliga lagar.
          </p>
          <p>
            Du behåller äganderätten till data du laddar upp (äggregistreringar, bilder, etc.), 
            men ger oss rätt att använda denna data för att tillhandahålla Tjänsten.
          </p>
        </section>

        <section>
          <h2>7. AI-funktioner</h2>
          <p>
            Premium-funktioner inkluderar AI-genererade råd och prognoser. Dessa är baserade 
            på din data och allmänna kunskaper om hönsskötsel, men:
          </p>
          <ul>
            <li>Ersätter inte professionell veterinärrådgivning</li>
            <li>Garanteras inte vara 100% korrekta</li>
            <li>Bör användas som ett komplement till din egen kunskap</li>
          </ul>
        </section>

        <section>
          <h2>8. Ansvarsfriskrivning</h2>
          <p>
            Tjänsten tillhandahålls "i befintligt skick" utan garantier. Vi garanterar inte:
          </p>
          <ul>
            <li>Att Tjänsten alltid är tillgänglig eller felfri</li>
            <li>Att AI-råd är korrekta eller lämpliga för din situation</li>
            <li>Att data aldrig förloras (gör egna backuper vid behov)</li>
          </ul>
        </section>

        <section>
          <h2>9. Ansvarsbegränsning</h2>
          <p>
            I den utsträckning lagen tillåter ansvarar vi inte för indirekta skador, 
            förlorade intäkter, dataförlust eller andra följdskador. Vårt maximala ansvar 
            är begränsat till vad du betalat för Tjänsten de senaste 12 månaderna.
          </p>
        </section>

        <section>
          <h2>10. Ändringar</h2>
          <h3>10.1 Ändringar av villkoren</h3>
          <p>
            Vi kan uppdatera dessa villkor. Väsentliga ändringar meddelas via e-post eller 
            i appen minst 30 dagar i förväg. Fortsatt användning innebär godkännande.
          </p>
          
          <h3>10.2 Ändringar av Tjänsten</h3>
          <p>
            Vi kan lägga till, ändra eller ta bort funktioner. Vi försöker meddela i förväg 
            vid större ändringar.
          </p>
        </section>

        <section>
          <h2>11. Uppsägning</h2>
          <p>
            Du kan avsluta ditt konto när som helst via Inställningar i appen. Vi kan 
            stänga av eller avsluta konton som bryter mot dessa villkor.
          </p>
        </section>

        <section>
          <h2>12. Tillämplig lag och tvister</h2>
          <p>
            Dessa villkor styrs av svensk lag. Tvister ska i första hand lösas genom 
            förhandling. Om det inte lyckas avgörs tvisten av svensk domstol.
          </p>
          <p>
            För konsumenttvister kan du även vända dig till Allmänna reklamationsnämnden (ARN): 
            <a href="https://www.arn.se" target="_blank" rel="noopener noreferrer">www.arn.se</a>
          </p>
        </section>

        <section>
          <h2>13. Kontakt</h2>
          <p>
            Aurora Media AB<br />
            E-post: <a href="mailto:info@honsgarden.se">info@honsgarden.se</a><br />
            Webbplats: <a href="https://honsgarden.se">honsgarden.se</a>
          </p>
        </section>
      </div>
    </div>
  );
}
