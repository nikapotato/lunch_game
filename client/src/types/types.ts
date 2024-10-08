export interface MealPrice {
    amount: number;
    currency: string;
}

export interface Meal extends MealPrice {
    player: string;
}

export interface Game {
    id: string;
    room_id: string;
    created_at_utc: string;
    ended_at_utc: string;
    is_active: boolean;
    players: string[];
    winners: string[];
    loser: string;
    meals: Meal[];
}

export interface Room {
    id: string;
    name: string; 
    code: string;
    created_at_utc: string;
    is_active: boolean;
}

export type Scores = { [player: string]: number };
