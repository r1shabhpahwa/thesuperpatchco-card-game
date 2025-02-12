import express from "express";

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());
app.use(express.text());

// Endpoint to handle the list of cards
app.post('/cards', (req, res) => {
    //const cards = req.body.cards;

    let cards;

    // Check the content type of the request
    if (req.is('application/json')) {
        // If the request is JSON( Ex: {cards : [..]})
        cards = req.body.cards;

    } else if (req.is('text/plain')) {
        // If the request is plain text (Ex: [..])
        cards = JSON.parse(req.body);
    } else {
        // Unsupported content type
        return res.status(400).json({ error: 'Unsupported input type.' });
    }

    if (!Array.isArray(cards)) {
        return res.status(400).json({ error: 'Input must be an array of cards' });
    }

    //Pre-process cards to handle multiple formats
    const cleanedCards = cards.map(preProcess);

    console.log(cleanedCards);
    
    res.status(200).send();
});

// Function to pre-process and normalize a single card
const preProcess = (card) => {
    if (typeof card === 'string') {
        // Handle comma-separated strings
        const [alphabet, number] = card.split(',');
        if (!alphabet || !number || isNaN(number)) {
            return { alphabet: null, number: null, error: 'Invalid format' };
        }
        return { alphabet: alphabet.trim(), number: parseInt(number.trim(), 10) };
    } else if (Array.isArray(card)) {
        // Handle arrays
        if (card.length !== 2 || typeof card[0] !== 'string' || typeof card[1] !== 'number') {
            return { alphabet: null, number: null, error: 'Invalid format' };
        }
        return { alphabet: card[0], number: card[1] };
    } else if (typeof card === 'object' && card !== null) {
        // Handle objects
        if (!card.alphabet || !card.number || typeof card.alphabet !== 'string' || typeof card.number !== 'number') {
            return { alphabet: null, number: null, error: 'Invalid format' };
        }
        return { alphabet: card.alphabet, number: card.number };
    } else {
        // Handle invalid formats
        return { alphabet: null, number: null, error: 'Invalid format' };
    }
};

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
