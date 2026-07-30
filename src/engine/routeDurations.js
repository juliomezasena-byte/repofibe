// Lookup table estricta para garantizar que el quiz evalúe exactamente
// el orden correcto: NRT > BOG > FRA=MAD > ACE > AGP > SVQ
// Independiente de la fórmula Haversine.

export const RouteDurations = {
  'NRT-MAD': 880, // ~14h 40m
  'BOG-MAD': 600, // ~10h 00m
  'FRA-MAD': 165, // ~2h 45m
  'MAD-FRA': 165, // ~2h 45m
  'ACE-MAD': 150, // ~2h 30m
  'AGP-BCN': 95,  // ~1h 35m
  'MAD-SVQ': 65,  // ~1h 05m
};

/**
 * Obtiene la duración estática para el quiz, si existe.
 * @param {string} route - Ej: 'FRA-MAD'
 * @returns {number|null} Minutos, o null si no está hardcodeado.
 */
export const getStaticDuration = (route) => {
  return RouteDurations[route] || null;
};
