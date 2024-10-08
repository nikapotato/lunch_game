export const ENDPOINTS = {
    GAME_HISTORY: '/v1/games/history',
    CREATE_ROOM: '/v1/rooms/create_room',
    GET_ROOM: (id: string) => `/v1/rooms/get_room/${id}`,
    GET_ROOMS: '/v1/rooms/get_rooms',
    START_GAME: '/v1/games/start_game',
    SUBMIT_MEAL: (id: string) => `/v1/games/${id}/submit_meal`,
    GET_GAME: (id: string) => `/v1/game/${id}`,
    GET_IS_ACTIVE: (id: string) => `/v1/rooms/get_is_active/${id}`,
}
