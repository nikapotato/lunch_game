# Lunch Game App

## Prerequisites

- [Yarn](https://yarnpkg.com/) 
- [Docker](https://www.docker.com/) 
- [Poetry](https://python-poetry.org/) 

## Running the Project

To set up and run the environment for both the API and the React client, follow these steps:

#### Client
1. Navigate to the client directory:
   ```
   cd client
   ```

2. Copy the sample environment file:
   ```
   cp .env.sample .env
   ```

3. Install the necessary dependencies and start the client:
   ```
   yarn install
   yarn start
   ```
4. Client will run on http://localhost:3000/

#### API

To run the Docker container that hosts the API, run the following commands:

1. Navigate to the API directory:
   ```
   cd lunch_app
   ```

2. Install the necessary dependencies:
   ```
   cp .env.sample .env
   ```

1. Build the Docker image:
   ```
   docker-compose build
   ```

2. Start the Docker container:
   ```
   docker-compose up
   ```

3. API will run on http://localhost:8000/ (you will be redirected to the docs).

## How to Play the Game

1. **Create or Join a Room**: You can create a new room or join an existing one. The game can start once more than one player has joined the room. If you are alone, wait for others to join. Once the game starts, no additional players can join.

2. **Enter Room Code**: If you created the room, share the room code with others. They can join by entering this code.

3. **Play the Game**: Once the game starts, each player clicks on the roulette to receive their score. The player with the lowest score "wins" and pays for the meal.

4. **Add Meal Cost**: After the game, each player can add the meal cost and currency.

5. **View Game History**: The game history, including the final meal cost, is stored and can be viewed by all players.

### TODO: Improvements

- Add database migrations.
- Implement tests.
- Enhance the UI of the Roulette game.
- Refactor `GameRoom.tsx` to split logic into smaller components and remove unnecessary parts.
- Integrate real currency exchange rate API.
- Track if users have paid for the meal.
- Fix issues:
    - If the game starts and a user leaves, leaving only one user, ensure the game finishes correctly.