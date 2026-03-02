/**
 * Svensk microcopy + snälla feltexter
 * Web + App använder samma texter
 */

export const MICROCOPY = {
  // ========================================
  // 1) GLOBALT — knappar, states, interaktion
  // ========================================
  buttons: {
    primary: {
      registerEggs: 'Registrera ägg',
      save: 'Spara',
      continue: 'Fortsätt',
      upgrade: 'Uppgradera',
      restorePurchases: 'Återställ köp',
      logout: 'Logga ut',
      close: 'Stäng',
    },
    secondary: {
      cancel: 'Avbryt',
      back: 'Tillbaka',
      edit: 'Redigera',
      delete: 'Ta bort',
      send: 'Skicka',
      readMore: 'Läs mer',
      tryAgain: 'Försök igen',
    },
  },

  // Loading / tomt läge
  states: {
    loading: 'Laddar…',
    loadingAI: 'Tänker…',
    emptyList: 'Inget att visa ännu.',
    emptyListFriendly: 'Här var det tomt just nu. Lägg till din första registrering så dyker det upp här.',
  },

  // Toast / bekräftelser
  toast: {
    saved: 'Sparat ✅',
    updated: 'Uppdaterat ✅',
    deleted: 'Borttaget.',
    sent: 'Skickat ✅',
  },

  // ========================================
  // 2) SNÄLLA FELTEXTER (alla AI och API-fel)
  // ========================================
  errors: {
    // Generellt fel (fallback)
    general: {
      title: 'Hoppsan',
      message: 'Ett tillfälligt fel uppstod. Försök gärna igen om en liten stund.',
    },
    // Nätverksfel
    network: {
      title: 'Ingen anslutning',
      message: 'Vi kommer inte åt internet just nu. Kontrollera din anslutning och försök igen.',
    },
    // Timeout (AI tar för lång tid)
    timeout: {
      title: 'Det tar lite tid',
      message: 'Det tar längre tid än vanligt. Försök igen om en stund.',
    },
    // Saknar data (statistik/AI behöver mer)
    insufficientData: {
      title: 'Vi behöver lite mer data',
      message: 'Registrera några dagar till så kan vi ge bättre insikter och prognoser.',
    },
    // Otillräcklig behörighet (om premium/admin)
    unauthorized: {
      title: 'Inte tillgängligt',
      message: 'Det här är inte tillgängligt för ditt konto just nu.',
    },
  },

  // ========================================
  // 3) HEM (bild 1) — microcopy som ska matcha layouten
  // ========================================
  home: {
    greetings: {
      morning: 'God morgon',
      afternoon: 'God eftermiddag',
      evening: 'God kväll',
      night: 'God natt',
    },
    header: {
      myFarm: 'Min Hönsgård',
    },
    stats: {
      yesterday: 'igår',
      hens: 'hönor',
      thisWeek: 'den här veckan',
    },
    cta: {
      title: 'Registrera ägg',
      subtitle: 'Tryck för att lägga till dagens ägg',
    },
    sections: {
      myFlock: 'MIN FLOCK',
      analysisEconomy: 'ANALYS & EKONOMI',
    },
    flock: {
      myHens: 'Mina hönor',
      addHen: 'Lägg till höna',
      noRooster: 'Du har ingen tupp. En tupp kan hjälpa till att hålla ordning i flocken och varna för rovdjur.',
    },
  },

  // ========================================
  // 4) AI-FUNKTIONER — exakta svenska texter per feature
  // ========================================
  ai: {
    // Fråga Agda
    askAgda: {
      title: 'Fråga Agda',
      subtitle: 'Din AI-rådgivare',
      inputPlaceholder: 'Skriv din fråga här…',
      sendButton: 'Skicka',
      loading: 'Agda tänker…',
      unclearQuestion: 'Jag hjälper gärna! Berätta gärna lite mer, t.ex. hur många hönor du har och hur många ägg du brukar få.',
      error: 'Jag kunde inte svara just nu. Försök igen om en stund.',
      emptyState: 'Skriv en fråga så hjälper Agda dig.',
    },
    // Dagens tips
    dailyTip: {
      title: 'Dagens tips',
      subtitle: 'Dagligt hönstips',
      loading: 'Hämtar dagens tips…',
      fallback: 'Vi hittar inget tips just nu. Försök igen lite senare.',
      noData: 'Registrera några dagar så kan vi ge mer träffsäkra tips.',
    },
    // Dagsrapport
    dailyReport: {
      title: 'Dagsrapport',
      subtitle: 'Personlig AI-analys',
      loading: 'Skapar din dagsrapport…',
      fallback: 'Vi kunde inte skapa en dagsrapport just nu. Försök igen om en stund.',
      noData: 'Det finns för lite data för en rapport idag. Registrera ägg och händelser så kan vi sammanfatta bättre.',
    },
    // 7-dagars prognos
    forecast: {
      title: '7-dagars prognos',
      subtitle: 'Förutsäg produktion',
      button: 'Ladda prognos',
      loading: 'Räknar på prognosen…',
      noData: 'Inte tillräckligt med data för att göra en prognos ännu. Registrera ägg några dagar till så blir prognosen bättre.',
      error: 'Prognosen kunde inte laddas just nu. Försök igen.',
    },
  },

  // ========================================
  // 5) EKONOMI — microcopy
  // ========================================
  economy: {
    title: 'Ekonomi',
    subtitle: 'Håll koll på kostnader och intäkter',
    cards: {
      costs: 'Kostnader',
      sales: 'Försäljning',
      net: 'Netto',
    },
    buttons: {
      addCost: 'Lägg till kostnad',
      addSale: 'Lägg till försäljning',
    },
    empty: 'Du har inga transaktioner ännu.',
  },

  // ========================================
  // 6) STATISTIK — microcopy
  // ========================================
  statistics: {
    title: 'Statistik',
    tabs: {
      overview: 'Översikt',
      perHen: 'Per höna',
      graphs: 'Grafer',
    },
    navigation: {
      previous: 'Föregående',
      next: 'Nästa',
    },
    empty: 'Inga registreringar för den här månaden ännu.',
    emptyHint: 'Registrera ägg så får du statistik här.',
  },

  // ========================================
  // 7) INSTÄLLNINGAR — microcopy (utan tema-väljare)
  // ========================================
  settings: {
    title: 'Inställningar',
    account: {
      title: 'Konto',
    },
    premium: {
      title: 'Premium',
      active: 'Aktiv',
      inactive: 'Inte aktiv',
      description: 'Lås upp fler funktioner och insikter.',
      manageSubscription: 'Hantera prenumeration',
      restorePurchases: 'Återställ köp',
    },
    reminders: {
      title: 'Påminnelser',
      enable: 'Aktivera påminnelser',
      time: 'Tid för påminnelse',
      sendTest: 'Skicka testpåminnelse',
    },
    support: {
      title: 'Kontakt & support',
      description: 'Behöver du hjälp? Hör av dig så hjälper vi dig gärna.',
      email: 'support@honsgarden.se',
    },
    logout: {
      button: 'Logga ut',
      confirmTitle: 'Logga ut?',
      confirmMessage: 'Vill du logga ut från appen?',
    },
    deleteAccount: {
      button: 'Radera konto',
      confirmTitle: 'Radera konto?',
      confirmMessage: 'Det går inte att ångra. Vill du verkligen radera ditt konto?',
    },
  },
};

// Helper function to get greeting based on time
export function getTimeBasedGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) {
    return MICROCOPY.home.greetings.morning;
  } else if (hour >= 12 && hour < 17) {
    return MICROCOPY.home.greetings.afternoon;
  } else if (hour >= 17 && hour < 22) {
    return MICROCOPY.home.greetings.evening;
  } else {
    return MICROCOPY.home.greetings.night;
  }
}

// Helper function to get error message
export function getErrorMessage(errorType: 'general' | 'network' | 'timeout' | 'insufficientData' | 'unauthorized'): { title: string; message: string } {
  return MICROCOPY.errors[errorType] || MICROCOPY.errors.general;
}

export default MICROCOPY;
