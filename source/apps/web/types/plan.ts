export interface Plan {
  id: string;
  mode: "demo" | "rules";
  hydration?: {
    eligible: boolean;
    total_water_ml: number | null;
    beverage_ml: number | null;
    range_ml?: number[] | null;
    food_water_ml: number | null;
    message: string;
    exercise_note: string;
    source_id: string;
  };
  evidence?: { id: string; name: string; url: string; use: string }[];
  goal: string;
  summary: {
    age: number;
    height: number;
    weight: number;
    days: number;
    minutes: number;
    location: string;
    goal_key: string;
  };
  nutrition: {
    bmr: number;
    tdee: number;
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
    method: string;
    guidance: string;
    budget: string;
    meal_count: number;
    menu_totals?: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
      water_ml: number;
    };
    vegetarian_note?: string | null;
  };
  training: {
    day: number;
    title: string;
    minutes: number;
    intensity: string;
    warmup: string;
    cooldown: string;
    exercises: {
      name: string;
      sets: number;
      reps: string;
      rest: string;
      alternative: string;
    }[];
  }[];
  meals: {
    day: number;
    meals: { name: string; items: string[]; swap: string }[];
  }[];
  safety: string[];
}
