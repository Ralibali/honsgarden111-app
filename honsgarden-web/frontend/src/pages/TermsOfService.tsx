import React from 'react';
import { Link } from 'react-router-dom';

export default function TermsOfService() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      color: 'var(--text-primary)',
      padding: '40px 20px'
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <Link to="/login" style={{ 
          color: 'var(--accent-primary)', 
          textDecoration: 'none',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '24px'
        }}>
          &larr; Tillbaka
        </Link>
        
        <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Anvandarvillkor</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
          Senast uppdaterad: December 2024
        </p>
        
        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '12px', color: 'var(--accent-primary)' }}>
            1. Acceptans av villkor
          </h2>
          <p style={{ lineHeight: '1.7', color: 'var(--text-secondary)' }}>
            Genom att anvanda Honsgarden godkanner du dessa villkor. Om du inte godkanner 
            villkoren, anvand inte tjansten.
          </p>
        </section>
        
        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '12px', color: 'var(--accent-primary)' }}>
            2. Beskrivning av tjansten
          </h2>
          <p style={{ lineHeight: '1.7', color: 'var(--text-secondary)' }}>
            Honsgarden ar en digital plattform for hobbyhonsagare som hjalper dig att:
          </p>
          <ul style={{ lineHeight: '1.7', color: 'var(--text-secondary)', paddingLeft: '20px' }}>
            <li>Registrera och spara aggproduktion</li>
            <li>Hantera dina honor och flockar</li>
            <li>Folja ekonomi och foderkostnader</li>
            <li>Fa AI-baserade rad (Premium)</li>
          </ul>
        </section>
        
        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '12px', color: 'var(--accent-primary)' }}>
            3. Konto och registrering
          </h2>
          <ul style={{ lineHeight: '1.7', color: 'var(--text-secondary)', paddingLeft: '20px' }}>
            <li>Du maste vara minst 18 ar for att skapa ett konto</li>
            <li>Du ansvarar for att halla dina inloggningsuppgifter sakra</li>
            <li>Du far inte dela ditt konto med andra</li>
            <li>Vi kan stanga konton som bryter mot villkoren</li>
          </ul>
        </section>
        
        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '12px', color: 'var(--accent-primary)' }}>
            4. Premium-prenumeration
          </h2>
          <ul style={{ lineHeight: '1.7', color: 'var(--text-secondary)', paddingLeft: '20px' }}>
            <li><strong>Priser:</strong> 19 kr/manad eller 149 kr/ar</li>
            <li><strong>Fornyelse:</strong> Prenumerationen fornyas automatiskt</li>
            <li><strong>Uppsagning:</strong> Du kan saga upp nar som helst via installningar</li>
            <li><strong>Aterbetalning:</strong> Ingen aterbetalning for paborjade perioder</li>
          </ul>
        </section>
        
        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '12px', color: 'var(--accent-primary)' }}>
            5. Anvandning av tjansten
          </h2>
          <p style={{ lineHeight: '1.7', color: 'var(--text-secondary)' }}>
            Du far inte:
          </p>
          <ul style={{ lineHeight: '1.7', color: 'var(--text-secondary)', paddingLeft: '20px' }}>
            <li>Anvanda tjansten for olagliga andamal</li>
            <li>Forsoka hacka eller storta tjansten</li>
            <li>Skapa falska konton</li>
            <li>Salja eller overlata ditt konto</li>
          </ul>
        </section>
        
        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '12px', color: 'var(--accent-primary)' }}>
            6. Immateriella rattigheter
          </h2>
          <p style={{ lineHeight: '1.7', color: 'var(--text-secondary)' }}>
            Honsgarden och all relaterad design, kod och innehall tillhor oss. Du far inte 
            kopiera, modifiera eller distribuera nagon del av tjansten utan tillstand.
          </p>
          <p style={{ lineHeight: '1.7', color: 'var(--text-secondary)', marginTop: '12px' }}>
            Din data tillhor dig. Vi har endast ratt att anvanda den for att tillhandahalla 
            tjansten.
          </p>
        </section>
        
        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '12px', color: 'var(--accent-primary)' }}>
            7. Ansvarsbegransning
          </h2>
          <p style={{ lineHeight: '1.7', color: 'var(--text-secondary)' }}>
            Tjansten tillhandahalls "i befintligt skick". Vi garanterar inte att tjansten 
            alltid ar tillganglig eller felfri. Vi ansvarar inte for:
          </p>
          <ul style={{ lineHeight: '1.7', color: 'var(--text-secondary)', paddingLeft: '20px' }}>
            <li>Forlust av data</li>
            <li>Avbrott i tjansten</li>
            <li>Indirekta skador</li>
          </ul>
        </section>
        
        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '12px', color: 'var(--accent-primary)' }}>
            8. Andring av villkor
          </h2>
          <p style={{ lineHeight: '1.7', color: 'var(--text-secondary)' }}>
            Vi kan uppdatera dessa villkor. Vid vasentliga andringar meddelar vi dig via 
            e-post. Fortsatt anvandning efter andring innebar att du godkanner de nya villkoren.
          </p>
        </section>
        
        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '12px', color: 'var(--accent-primary)' }}>
            9. Tillamplig lag
          </h2>
          <p style={{ lineHeight: '1.7', color: 'var(--text-secondary)' }}>
            Dessa villkor lyder under svensk lag. Tvister avgors av svensk domstol.
          </p>
        </section>
        
        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '12px', color: 'var(--accent-primary)' }}>
            10. Kontakt
          </h2>
          <p style={{ lineHeight: '1.7', color: 'var(--text-secondary)' }}>
            Fragor om villkoren? Kontakta oss:<br />
            E-post: <a href="mailto:support@honsgarden.se" style={{ color: 'var(--accent-primary)' }}>support@honsgarden.se</a>
          </p>
        </section>
        
        <div style={{ 
          marginTop: '48px', 
          paddingTop: '24px', 
          borderTop: '1px solid var(--border-color)',
          textAlign: 'center'
        }}>
          <Link to="/privacy" style={{ color: 'var(--accent-primary)', marginRight: '24px' }}>
            Integritetspolicy
          </Link>
          <Link to="/login" style={{ color: 'var(--text-secondary)' }}>
            Tillbaka till inloggning
          </Link>
        </div>
      </div>
    </div>
  );
}
