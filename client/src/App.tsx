import { BrowserRouter, Routes, Route } from 'react-router-dom';

import Layout from './components/Layout';
import HomeComponent from './pages/HomePage';
import GameRoom from './pages/GameRoom';
import HistoryPage from './pages/HistoryPage';
import './App.css';
import { UserProvider } from './context/UserContext';

function App() {
  return (
    <UserProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<HomeComponent />} />
            <Route path="/room/:roomId" element={<GameRoom />} />
            <Route path="/history" element={<HistoryPage />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </UserProvider>

  );
}

export default App;
