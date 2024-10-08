# Lunch Game App

## Running the Project

### Setup Environment Variables

Setup environment variables for both the API and the React client:
```
cp .env.sample .env
```

### Running the Docker Container with the API
To run the Docker container which hosts the API, use the following command:
```
docker-compose up
```

### Running the React Client
Setup environment variables:
```
cp .env.sample .env
```

## How to play a game

1. You can create a new room or join an existing one. After n > 1 players have joined the room, the game can be started by clicking on the "Start Game" button.
    - If player is alone in the room, player must wait for other players to join.
    - After game starts, another player can't join the room.

2. If you created the room, you need to enter the code to the game room. Other players can join the room by entering the code.

3. After game starts, you will see the roulette. Each player clicks on the roulette and receives their score. User with the lowest score is the winner, pays for the meal of the whole team.

4. After the game is over, each player can add the meal cost and currency to the game.

5. The game history is stored and can be viewed by all players. As well as what is the final amount of the meal for the game.

### TODO: Improvements

- Add Migrations. 
- Add tests.
- Improve UI of the Roulette game.
- Refactor the code, mainly GameRoom.tsx to split the logic into smaller components + remove unnecessary parts.
- Add real currency exchange rate call to api.
- Tracking if users has paid for the meal.
- Fix potential issues: After game started, and one user leaves the room, and only one user is left, the game will not be correctly finished.