// Font family constants for use throughout the app
export const fonts = {
  // Playfair Display - for headings and titles
  heading: {
    regular: 'PlayfairDisplay_400Regular',
    medium: 'PlayfairDisplay_500Medium',
    semiBold: 'PlayfairDisplay_600SemiBold',
    bold: 'PlayfairDisplay_700Bold',
  },
  // Inter - for body text and UI elements
  body: {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semiBold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
  },
};

// Typography presets
export const typography = {
  // Headings
  h1: {
    fontFamily: fonts.heading.bold,
    fontSize: 32,
  },
  h2: {
    fontFamily: fonts.heading.semiBold,
    fontSize: 24,
  },
  h3: {
    fontFamily: fonts.heading.medium,
    fontSize: 20,
  },
  // Body text
  body: {
    fontFamily: fonts.body.regular,
    fontSize: 16,
  },
  bodyMedium: {
    fontFamily: fonts.body.medium,
    fontSize: 16,
  },
  bodyBold: {
    fontFamily: fonts.body.bold,
    fontSize: 16,
  },
  // Small text
  caption: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
  },
  // UI elements
  button: {
    fontFamily: fonts.body.semiBold,
    fontSize: 16,
  },
  label: {
    fontFamily: fonts.body.medium,
    fontSize: 14,
  },
};
