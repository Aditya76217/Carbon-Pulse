// Carbon emission factors in kg CO2 per unit
export const EMISSION_FACTORS = {
  transportation: {
    driving_petrol: 0.20, // per mile
    driving_suv: 0.30,    // per mile
    driving_ev: 0.05,     // per mile (grid average)
    public_transit: 0.06, // per mile (bus/train average)
    flight_short: 150.0,  // per hour (takeoff heavy)
    flight_long: 110.0,   // per hour
  },
  energy: {
    electricity_kwh: 0.38,   // per kWh
    gas_therms: 5.3,         // per therm
    heating_oil_gal: 10.1,   // per gallon
  },
  food: {
    heavy_meat: 7.2,       // per serving (high beef/lamb)
    light_meat: 2.5,       // per serving (chicken/pork)
    vegetarian: 0.8,       // per serving
    vegan: 0.4,            // per serving
  },
  waste: {
    unsorted_bag: 1.5,     // per trash bag
    recycling_offset: -0.6 // negative carbon for recycling a bag's worth
  }
};

// Eco habits and their carbon saving in kg CO2 per day / per execution
export const HABIT_SAVINGS = {
  public_transit_commute: 4.2, // taking bus instead of driving average car
  meatless_day: 5.0,           // eating vegetarian/vegan for a day instead of meat
  cold_water_wash: 0.3,        // washing laundry in cold water
  line_dry_laundry: 1.0,       // air drying instead of dryer
  shorter_shower: 0.5,         // cutting shower by 5 minutes
  unplug_standby: 0.2,         // turning off standby devices
  reusable_bags: 0.1,          // avoiding single-use plastics
  composting: 0.4              // composting organic waste
};

/**
 * Calculates CO2 emissions for a given activity log
 * @param {string} category 
 * @param {string} type 
 * @param {number} value 
 * @returns {number} kg CO2
 */
export function calculateActivityCO2(category, type, value) {
  const numValue = parseFloat(value) || 0;
  if (!EMISSION_FACTORS[category] || !EMISSION_FACTORS[category][type]) {
    return 0;
  }
  return Number((EMISSION_FACTORS[category][type] * numValue).toFixed(2));
}

/**
 * Calculates a user's initial annual baseline carbon footprint (in metric tons CO2)
 * @param {object} answers 
 * @returns {object} { totalBaselineTons, breakdown: { transportation, energy, food, waste } }
 */
export function calculateBaselineQuiz(answers) {
  const {
    carType = 'petrol',
    carMilesPerWeek = 0,
    transitMilesPerWeek = 0,
    flightHoursPerYear = 0,
    electricityKwhPerMonth = 0,
    heatingType = 'gas',
    heatingUsagePerMonth = 0,
    dietType = 'light_meat',
    wasteBagsPerWeek = 0,
    recycles = false
  } = answers;

  // 1. Transportation (Annualized)
  const weeklyCarMiles = parseFloat(carMilesPerWeek) || 0;
  const carFactor = EMISSION_FACTORS.transportation[`driving_${carType}`] || EMISSION_FACTORS.transportation.driving_petrol;
  const annualCarCO2 = weeklyCarMiles * 52 * carFactor;

  const weeklyTransitMiles = parseFloat(transitMilesPerWeek) || 0;
  const transitFactor = EMISSION_FACTORS.transportation.public_transit;
  const annualTransitCO2 = weeklyTransitMiles * 52 * transitFactor;

  const annualFlightHours = parseFloat(flightHoursPerYear) || 0;
  // Simple check: flights under 10 hours total are short flights, else combine
  const flightFactor = annualFlightHours > 15 ? EMISSION_FACTORS.transportation.flight_long : EMISSION_FACTORS.transportation.flight_short;
  const annualFlightCO2 = annualFlightHours * flightFactor;

  const totalTransportCO2 = annualCarCO2 + annualTransitCO2 + annualFlightCO2;

  // 2. Home Energy (Annualized)
  const monthlyKwh = parseFloat(electricityKwhPerMonth) || 0;
  const annualElectricityCO2 = monthlyKwh * 12 * EMISSION_FACTORS.energy.electricity_kwh;

  const monthlyHeating = parseFloat(heatingUsagePerMonth) || 0;
  let heatingFactor = 0;
  if (heatingType === 'gas') heatingFactor = EMISSION_FACTORS.energy.gas_therms;
  else if (heatingType === 'oil') heatingFactor = EMISSION_FACTORS.energy.heating_oil_gal;
  const annualHeatingCO2 = monthlyHeating * 12 * heatingFactor;

  const totalEnergyCO2 = annualElectricityCO2 + annualHeatingCO2;

  // 3. Food (Annualized: 3 meals/day * 365 days = 1095 meals)
  const foodFactor = EMISSION_FACTORS.food[dietType] || EMISSION_FACTORS.food.light_meat;
  const annualFoodCO2 = 1095 * foodFactor;

  // 4. Waste (Annualized)
  const weeklyWasteBags = parseFloat(wasteBagsPerWeek) || 0;
  const annualWasteCO2 = weeklyWasteBags * 52 * EMISSION_FACTORS.waste.unsorted_bag;
  const annualRecyclingOffset = recycles ? (weeklyWasteBags * 52 * EMISSION_FACTORS.waste.recycling_offset) : 0;
  const totalWasteCO2 = Math.max(0, annualWasteCO2 + annualRecyclingOffset);

  // Total in kg
  const totalKg = totalTransportCO2 + totalEnergyCO2 + annualFoodCO2 + totalWasteCO2;

  // Convert to metric tons (1 ton = 1000 kg)
  return {
    totalBaselineTons: Number((totalKg / 1000).toFixed(2)),
    breakdownTons: {
      transportation: Number((totalTransportCO2 / 1000).toFixed(2)),
      energy: Number((totalEnergyCO2 / 1000).toFixed(2)),
      food: Number((annualFoodCO2 / 1000).toFixed(2)),
      waste: Number((totalWasteCO2 / 1000).toFixed(2))
    }
  };
}
