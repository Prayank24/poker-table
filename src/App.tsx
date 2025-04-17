// src/App.tsx
/* Poker Table – single‑device chip tracker
   ▸ Full no‑limit hold‑em flow
   ▸ Auto side‑pots & auto‑finish when one active player remains
   ▸ Folded players greyed out, current‑turn highlight, sit‑out, top‑up
   ▸ Local‑storage persistence */

   import { useEffect, useState } from 'react';
   import './App.css';
   
   interface Player {
     id: string;
     name: string;
     chips: number;
     sitOut?: boolean;
     folded?: boolean;
   }
   type Position = 'D' | 'SB' | 'BB' | '';
   type ActionType = 'CHECK' | 'CALL' | 'RAISE' | 'FOLD';
   interface Action {
     playerId: string;
     playerName: string;
     type: ActionType;
     amount?: number;
   }
   interface Pot {
     amount: number;
     eligible: string[];
   }
   
   export default function App() {
     // Core state
     const [players, setPlayers] = useState<Player[]>([]);
     const [dealerId, setDealerId] = useState('');
     const [positions, setPositions] = useState<Record<string, Position>>({});
     const [currentTurnId, setCurrentTurnId] = useState('');
     const [actions, setActions] = useState<Action[]>([]);
     const [contribs, setContribs] = useState<Record<string, number>>({});
     const [pots, setPots] = useState<Pot[]>([]);
     const [started, setStarted] = useState(false);
   
     // Table settings
     const [smallBlind, setSmallBlind] = useState('');
     const [bigBlind, setBigBlind] = useState('');
     const [currentBet, setCurrentBet] = useState(0);
     const [currency, setCurrency] = useState<'₹' | '$' | 'AED'>('₹');
   
     // Inputs
     const [name, setName] = useState('');
     const [chips, setChips] = useState('');
     const [raiseAmount, setRaiseAmount] = useState('');
     const [topUpPlayerId, setTopUpPlayerId] = useState('');
     const [topUpAmount, setTopUpAmount] = useState('');
   
     // Modals
     const [showRanks, setShowRanks] = useState(false);
     const [showFinish, setShowFinish] = useState(false);
     const [winnerIds, setWinnerIds] = useState<string[]>([]);
   
     // Persistence
     useEffect(() => {
       const s = localStorage.getItem('poker-players');
       if (s) setPlayers(JSON.parse(s));
     }, []);
     useEffect(() => {
       localStorage.setItem('poker-players', JSON.stringify(players));
     }, [players]);
   
     // Helpers
     const addPlayer = () => {
       if (!name || !chips) return;
       setPlayers(ps => [
         ...ps,
         { id: Date.now().toString(), name, chips: parseFloat(chips) },
       ]);
       setName('');
       setChips('');
     };
   
     const toggleSitOut = (id: string) => {
       setPlayers(ps =>
         ps.map(p => (p.id === id ? { ...p, sitOut: !p.sitOut } : p))
       );
     };
   
     const rotatePositions = (dealer: string) => {
       const idx = players.findIndex(p => p.id === dealer);
       if (idx === -1) return;
       const ordered = [...players.slice(idx), ...players.slice(0, idx)];
       const active = ordered.filter(p => !p.sitOut);
       const pos: Record<string, Position> = {};
       active.forEach(p => (pos[p.id] = ''));
       if (active.length >= 2) {
         const [d, sb, bb, first] = [
           active[0],
           active[1 % active.length],
           active[2 % active.length],
           active[3 % active.length],
         ];
         pos[d.id] = 'D';
         pos[sb.id] = 'SB';
         pos[bb.id] = 'BB';
         setCurrentTurnId(first?.id || '');
       }
       setPositions(pos);
     };
   
     const getNextTurn = (from: string) => {
       const actives = players.filter(
         p => !p.sitOut && !p.folded && p.chips > 0
       );
       const idx = actives.findIndex(p => p.id === from);
       return idx >= 0 && actives.length > 1
         ? actives[(idx + 1) % actives.length].id
         : '';
     };
   
     const deduct = (pid: string, amt: number) => {
       setPlayers(ps =>
         ps.map(p =>
           p.id === pid ? { ...p, chips: +(p.chips - amt).toFixed(2) } : p
         )
       );
       setContribs(c => ({
         ...c,
         [pid]: (c[pid] || 0) + amt,
       }));
     };
   
     // Game flow
     const startGame = () => {
       if (!dealerId || !smallBlind || !bigBlind) return;
       setStarted(true);
       setActions([]);
       setContribs({});
       rotatePositions(dealerId);
       const sbId = Object.keys(positions).find(id => positions[id] === 'SB');
       const bbId = Object.keys(positions).find(id => positions[id] === 'BB');
       const sb = parseFloat(smallBlind) || 0;
       const bb = parseFloat(bigBlind) || 0;
       if (sbId) deduct(sbId, sb);
       if (bbId) deduct(bbId, bb);
       setCurrentBet(bb);
     };
   
     const resetHand = () => {
       setStarted(false);
       setPlayers(ps => ps.map(p => ({ ...p, folded: false })));
       setActions([]);
       setContribs({});
       if (dealerId) {
         const idx = players.findIndex(p => p.id === dealerId);
         const next = players[(idx + 1) % players.length]?.id;
         if (next) setDealerId(next);
       }
     };
   
     const autoFinish = (winnerId: string) => {
       const total = pots.reduce((sum, p) => sum + p.amount, 0);
       setPlayers(ps =>
         ps.map(p =>
           p.id === winnerId ? { ...p, chips: p.chips + total } : p
         )
       );
       alert(
         `${players.find(p => p.id === winnerId)?.name} wins ${currency}${total.toFixed(
           2
         )}`
       );
       resetHand();
     };
   
     const perform = (type: ActionType, amount?: number) => {
       const pl = players.find(p => p.id === currentTurnId);
       if (!pl) return;
   
       if (type === 'CALL') {
         const due = currentBet - (contribs[pl.id] || 0);
         if (due > 0) deduct(pl.id, due);
       }
       if (type === 'RAISE' && amount != null) {
         deduct(pl.id, amount);
         setCurrentBet(amount);
       }
       if (type === 'FOLD') {
         const updated = players.map(p =>
           p.id === pl.id ? { ...p, folded: true } : p
         );
         setPlayers(updated);
         const left = updated.filter(
           q => !q.sitOut && !q.folded && q.chips > 0
         );
         if (left.length === 1) {
           autoFinish(left[0].id);
           return;
         }
       }
   
       setActions(a => [
         ...a,
         { playerId: pl.id, playerName: pl.name, type, amount },
       ]);
       setCurrentTurnId(getNextTurn(pl.id));
     };
   
     const applyFinish = () => {
       const total = pots.reduce((sum, p) => sum + p.amount, 0);
       const winners = players.filter(p => winnerIds.includes(p.id));
       if (winners.length === 0) {
         alert('Select at least one winner');
         return;
       }
       const share = +(total / winners.length).toFixed(2);
       setPlayers(ps =>
         ps.map(p =>
           winners.some(w => w.id === p.id)
             ? { ...p, chips: p.chips + share }
             : p
         )
       );
       resetHand();
       setShowFinish(false);
       setWinnerIds([]);
     };
   
     const topUp = () => {
       const bb = parseFloat(bigBlind) || 0;
       if (!topUpPlayerId || !topUpAmount) return;
       if (parseFloat(topUpAmount) < bb) {
         alert(`Minimum top‑up is BB (${bb})`);
         return;
       }
       setPlayers(ps =>
         ps.map(p =>
           p.id === topUpPlayerId
             ? { ...p, chips: p.chips + parseFloat(topUpAmount) }
             : p
         )
       );
       setTopUpPlayerId('');
       setTopUpAmount('');
     };
   
     // Side‑pot calculation
     useEffect(() => {
       const stakes = Array.from(new Set(Object.values(contribs))).sort(
         (a, b) => a - b
       );
       let prev = 0;
       setPots(
         stakes.map(stk => {
           const delta = stk - prev;
           prev = stk;
           const eligible = Object.entries(contribs)
             .filter(([, amt]) => amt >= stk)
             .map(([id]) => id);
           return { amount: delta * eligible.length, eligible };
         })
       );
     }, [contribs]);
   
     // Recompute positions when dealer changes or players count changes
     useEffect(() => {
       if (dealerId) rotatePositions(dealerId);
     }, [dealerId, players.length]);
   
     return (
       <div className="wrapper">
         {/* Header */}
         <div className="header">
           <h1>Poker Table</h1>
           <button className="info-btn" onClick={() => setShowRanks(!showRanks)}>
             ℹ️
           </button>
         </div>
   
         {/* Hand Rankings Modal */}
         {showRanks && (
           <div className="ranks-modal">
             <h3>Hand Rankings</h3>
             <ol>
               <li>Royal Flush</li>
               <li>Straight Flush</li>
               <li>Four of a Kind</li>
               <li>Full House</li>
               <li>Flush</li>
               <li>Straight</li>
               <li>Three of a Kind</li>
               <li>Two Pair</li>
               <li>One Pair</li>
               <li>High Card</li>
             </ol>
             <button onClick={() => setShowRanks(false)}>Close</button>
           </div>
         )}
   
         {/* Top Controls */}
         <div className="top-controls">
           {!started ? (
             <button onClick={startGame}>Start Game</button>
           ) : (
             <button onClick={() => setShowFinish(true)}>Finish Hand</button>
           )}
           <label>
             SB:
             <input
               type="number"
               value={smallBlind}
               onChange={e => setSmallBlind(e.target.value)}
             />
           </label>
           <label>
             BB:
             <input
               type="number"
               value={bigBlind}
               onChange={e => setBigBlind(e.target.value)}
             />
           </label>
           <label>
             Currency:
             <select
               value={currency}
               onChange={e => setCurrency(e.target.value as any)}
             >
               <option value="₹">INR (₹)</option>
               <option value="$">USD ($)</option>
               <option value="AED">AED</option>
             </select>
           </label>
         </div>
   
         {/* Finish Hand Modal */}
         {showFinish && (
           <div className="modal">
             <h3>Select Winner(s)</h3>
             <div className="winner-list">
               {players
                 .filter(p => !p.folded)
                 .map(p => (
                   <label key={p.id}>
                     <input
                       type="checkbox"
                       value={p.id}
                       checked={winnerIds.includes(p.id)}
                       onChange={e => {
                         const id = e.target.value;
                         setWinnerIds(ws =>
                           e.target.checked ? [...ws, id] : ws.filter(x => x !== id)
                         );
                       }}
                     />
                     {p.name}
                   </label>
                 ))}
             </div>
             <button onClick={applyFinish}>Confirm</button>
             <button
               onClick={() => {
                 setShowFinish(false);
                 setWinnerIds([]);
               }}
             >
               Cancel
             </button>
           </div>
         )}
   
         {/* Add Player */}
         <div className="input-area">
           <input
             placeholder="Player name"
             value={name}
             onChange={e => setName(e.target.value)}
           />
           <input
             placeholder="Chips"
             type="number"
             value={chips}
             onChange={e => setChips(e.target.value)}
           />
           <button onClick={addPlayer}>Add Player</button>
         </div>
   
         {/* Dealer Selector */}
         {players.length >= 2 && (
           <div className="dealer-control">
             <label>Dealer:</label>
             <select value={dealerId} onChange={e => setDealerId(e.target.value)}>
               <option value="">--</option>
               {players.map(p => (
                 <option key={p.id} value={p.id}>
                   {p.name}
                 </option>
               ))}
             </select>
           </div>
         )}
   
         {/* Pot Display */}
         <div className="pot-display">
           <h4>
             Pot: {currency}
             {pots.reduce((sum, pot) => sum + pot.amount, 0).toFixed(2)}
           </h4>
           {pots.length > 1 &&
             pots.map((pot, i) => (
               <div key={i} className="side-pot">
            Side Pot {i + 1}: {currency}
            {pot.amount.toFixed(2)} (
            {pot.eligible
              .map(id => players.find(p => p.id === id)?.name)
              .join(', ')}
            )
          </div>
        ))}
    </div>

    {/* Table + Sidebar */}
    <div className="main-area">
      {/* Poker Table */}
      <div className="table">
        {players.map((p, idx) => {
          const angle = (360 / players.length) * idx;
          const r = 155;
          const x = r * Math.cos((angle * Math.PI) / 180);
          const y = r * Math.sin((angle * Math.PI) / 180);
          return (
            <div
              key={p.id}
              className={`player ${p.id === currentTurnId ? 'active' : ''} ${
                p.folded ? 'folded' : ''
              }`}
              style={{ transform: `translate(${x}px, ${y}px)` }}
            >
              <div>{p.name}</div>
              <div>
                {currency}
                {p.chips.toFixed(2)}
              </div>
              {positions[p.id] && <span className="badge">{positions[p.id]}</span>}
              <label>
                <input
                  type="checkbox"
                  checked={!!p.sitOut}
                  onChange={() => toggleSitOut(p.id)}
                />{' '}
                Sit Out
              </label>
            </div>
          );
        })}
        <div className="center">Pot Area</div>
      </div>

      {/* Sidebar */}
      <div className="sidebar">
        {/* Action Log */}
        <div className="action-log">
          <h4>Action Log</h4>
          <ul>
            {actions.map((a, i) => (
              <li key={i}>
                {a.playerName} → {a.type}
                {a.amount ? ` ${currency}${a.amount.toFixed(2)}` : ''}
              </li>
            ))}
          </ul>
        </div>

        {/* Action Buttons */}
        {started && currentTurnId && (
          <div className="actions-area">
            <button
              onClick={() => perform('CHECK')}
              disabled={(contribs[currentTurnId] || 0) < currentBet}
            >
              Check
            </button>
            <button
              onClick={() => perform('CALL')}
              disabled={(contribs[currentTurnId] || 0) >= currentBet}
            >
              Call
            </button>
            <input
              placeholder="Raise"
              type="number"
              value={raiseAmount}
              onChange={e => setRaiseAmount(e.target.value)}
            />
            <button onClick={() => perform('RAISE', parseFloat(raiseAmount))}>
              Raise
            </button>
            <button onClick={() => perform('FOLD')}>Fold</button>
          </div>
        )}

        {/* Top‑Up */}
        {players.length > 0 && (
          <div className="top-up">
            <label>Top Up:</label>
            <select value={topUpPlayerId} onChange={e => setTopUpPlayerId(e.target.value)}>
              <option value="">--</option>
              {players.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <input
              placeholder="Amount"
              type="number"
              value={topUpAmount}
              onChange={e => setTopUpAmount(e.target.value)}
            />
            <button onClick={topUp}>Top Up</button>
          </div>
        )}
      </div>
    </div>
  </div>
);
}
   