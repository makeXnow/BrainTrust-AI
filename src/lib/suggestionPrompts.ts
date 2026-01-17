export const SUGGESTION_PROMPTS = [
  "Will AI reduce happiness despite massive productivity gains?",
  "Does AGI come from scaling or breakthroughs?",
  "Should AI be allowed to own assets?",
  "Will software engineers still exist in 20 years?",
  "Does regulation slow or accelerate AI progress?",
  "Does AI empower small teams over corporations?",
  "Is open-source AI safer than closed models?",
  "Is universal basic income inevitable?",
  "Will the middle class shrink or adapt?",
  "Is remote work permanent or reversing?",
  "Are entrepreneurs more impactful than governments?",
  "Will talent matter more than capital?",
  "Best Southeast Asia country for fun living?",
  "Is Western Europe declining relative to emerging regions?",
  "Megacities or smaller cities long-term?",
  "Is digital nomadism a lasting lifestyle?",
  "Is the US best for startups?",
  "Does social media polarize or educate people?",
  "Is modern dating broken?",
  "Are humans less ambitious today?",
  "Does convenience make life emptier?",
  "Is privacy already dead?",
  "What’s the world’s most impactful food?",
  "Is street food better than restaurants?",
  "Has fast food harmed food culture?",
  "Is taste cultural or biological?",
  "Which cuisine will dominate globally?",
  "Is intelligence more important than consciousness?",
  "Should AI prioritize truth or usefulness?",
  "Is progress linear, exponential, or cyclical?",
  "Does meaning come from struggle or freedom?",
  "Is pessimism more realistic than optimism?",
  "Speed or safety in AI?",
  "Rank money, freedom, status, happiness",
  "Lose internet, cars, or airplanes?",
  "Intent or outcome: which matters more?",
  "Ban social media, advertising, or fast food?"
];

export const getRandomSuggestions = (count: number = 3) => {
  const shuffled = [...SUGGESTION_PROMPTS].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};
