import { useState } from "react";
import axios from "axios";
import "./App.css";

function App() {
  const initialCards = JSON.stringify([
    { sideA: "D", sideB: 3 },
    [5, "A"],
    "B,2",
    { Alphabet: "C", Number: 28 },
    ["X", 4],
    "D,4",
    { sideB: 9, sideA: "Y" },
    ["Z", 1],
    "M,8",
    { sideA: "P", sideB: 4 },
    ["Q", 6],
    "V,3",
    { sideA: "D", sideB: 3 },
    ["E", 0],
    "R,7",
    { sideA: "T", sideB: 2 },
    ["J", 3],
    "Test",
    { sideA: "W", sideB: 6 },
    ["Z", 9],
  ]);

  const [cards, setCards] = useState(initialCards);
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const res = await axios.post(
        "https://172.21.0.2:3200/cards",
        { cards: JSON.parse(cards) },
        { headers: { "Content-Type": "application/json" } }
      );

      if (!res.data.discardCount && !res.data.invalidCards?.length) {
        setResponse("Deck is valid. No errors found!");
      } else {
        setResponse(res.data);
      }
    } catch (err) {
      setError(err.response ? err.response.data : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await axios.get("https://172.21.0.2:3200/history");
      setHistory(res.data.history);
    } catch (err) {
      setError("Failed to fetch history");
    }
  };

  return (
    <div className="App">
      <h1>TheSuperPatchCompany - Backend Assessment</h1>
      <p>Enter cards using any combination of objects, strings, and arrays.</p>
      <p>(Prepopulated with a case)</p>
      <form onSubmit={handleSubmit}>
        <textarea
          rows="20"
          cols="50"
          value={cards}
          onChange={(e) => setCards(e.target.value)}
        />
        <br />
        <button type="submit" disabled={loading}>
          {loading ? "Validating..." : "Submit Cards"}
        </button>
      </form>
      <button onClick={fetchHistory} style={{ marginTop: "20px" }}>
        Show History
      </button>

      {response && typeof response === "string" && (
        <div style={{ color: "green", marginTop: "20px" }}>
          <h3>Success:</h3>
          <p>{response}</p>
        </div>
      )}

      {error && (
        <div style={{ color: "red", marginTop: "20px" }}>
          <h3>Validation Result:</h3>
          <p>{error.validationResult}</p>
          <p>Discarded Cards: {error.discardCount}</p>
          <h4>Errors:</h4>
          <ul>
            {error.invalidCards?.map((card, index) => (
              <li key={index}>
                <strong>Card Index {card.id}:</strong> {card.errors.join(", ")}
              </li>
            ))}
          </ul>
        </div>
      )}

      {history && (
        <div style={{ marginTop: "20px" }}>
          <h3>History:</h3>
          <ul>
            {history.map((entry, index) => (
              <li key={index}>
                Deck ID: {entry.deckId}, Card ID: {entry.cardId}, Alphabet: {entry.alphabet}, Number: {entry.number}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default App;
