import { useEffect, useState } from 'react';
import './App.css';

type Player = {
  id: string;
  name: string;
  chips: number;
};

export default function App() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [name, setName] = useState('');
  const [chips, setChips] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('players');
    if (saved) {
      setPlayers(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('players', JSON.stringify(players));
  }, [players]);

  const addPlayer = () => {
    if (!name || !chips) return;
    const newPlayer: Player = {
      id: Date.now().toString(),
      name,
      chips: parseFloat(chips),
    };
    setPlayers([...players, newPlayer]);
    setName('');
    setChips('');
  };

  return (
    <div className="wrapper">
      <h1>Poker Table</h1>

      <div className="input-area">
        <input
          placeholder="Player name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          placeholder="Chips"
          value={chips}
          type="number"
          onChange={(e) => setChips(e.target.value)}
        />
        <button onClick={addPlayer}>Add Player</button>
      </div>

      <div className="table">
        {players.map((p, i) => {
          const angle = (360 / players.length) * i;
          const radius = 130;
          const x = radius * Math.cos((angle * Math.PI) / 180);
          const y = radius * Math.sin((angle * Math.PI) / 180);
          return (
            <div
              key={p.id}
              className="player"
              style={{
                transform: `translate(${x}px, ${y}px)`,
              }}
            >
              {p.name} <br /> ₹{p.chips.toFixed(2)}
            </div>
          );
        })}
        <div className="center">Pot Area</div>
      </div>
    </div>
  );
}

