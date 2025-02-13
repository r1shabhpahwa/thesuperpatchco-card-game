import express from "express";
import winston from "winston";
import { v1 as uuidv1 } from "uuid";
import cors from 'cors';
import { Mutex } from 'async-mutex';

const app = express();
const PORT = process.env.PORT || 3000;

// Allow all origins (or configure as needed)
app.use(cors());

// Setup Winston logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} ${level}: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log' })
  ]
});

// Middleware to parse JSON bodies
app.use(express.json());
app.use(express.text());

// History tracking
let cardHistory = [];
const historyMutex = new Mutex();

// Endpoint to handle the list of cards
app.post('/cards', (req, res) => {
    let cards;

    logger.info(`Received request with content type: ${req.get('Content-Type')}`);

    // Check the content type of the request
    if (req.is('application/json')) {
        // If the request is JSON( Ex: {cards : [..]})
        cards = req.body.cards;
    } else if (req.is('text/plain')) {
        // If the request is plain text (Ex: [..])
        try {
            cards = JSON.parse(req.body);
        } catch (err) {
            return res.status(400).json({ error: 'Invalid JSON format in text input.' });
        }
    } else {
        // Unsupported content type
        return res.status(400).json({ error: 'Unsupported input type.' });
    }

    if (!Array.isArray(cards)) {
        return res.status(400).json({ error: 'Input must be an array of cards' });
    }

    logger.info(`Received ${cards.length} cards for validation.`);

    // Ensure exactly 20 cards are provided
    if (cards.length !== 20) {
        return res.status(400).json({ validationResult: 'The deck must have 20 cards.' });
    }

    // Pre-process cards to handle multiple formats
    const cleanedCards = cards.map((card, index) => preProcess(card, index));

    //console.log(cleanedCards);

    // Validate cards
    const validatedCards = validateCards(cleanedCards);

    // Filter out invalid cards
    const invalidCards = validatedCards.filter(card => card.errors && card.errors.length > 0);

    // Save Scanned Cards History
    logger.info("Saving processed card history...");
    saveHistory(validatedCards);

    if (invalidCards.length > 0) {
        logger.warn(`Validation failed for ${invalidCards.length} cards.`);
        return res.status(400).json({
            validationResult: 'Invalid card data.',
            discardCount: invalidCards.length,
            invalidCards: invalidCards
        });
    }

    logger.info("All cards validated successfully.");
    res.status(200).json({ validationResult: 'Deck is valid' });
});

app.get('/history', (req, res) => {
    res.status(200).json({ history: cardHistory });
});

const saveHistory = async (scannedCards) => {
    const release = await historyMutex.acquire();
    try {
        let deckId = uuidv1();

        scannedCards.forEach(card => {
            cardHistory.push({
                deckId: deckId,
                cardId: card.id,
                alphabet: card.alphabet,
                number: card.number,
                errors: card.errors
            });
        });
    } finally {
        release(); // Release the lock
    }
};


const preProcess = (card, id) => {
    if (typeof card === 'string') {
        // Handle comma-separated strings in any order
        const parts = card.split(',').map(part => part.trim());
        let alphabet = null, number = null;

        parts.forEach(part => {
            if (!alphabet && isNaN(part)) {
                alphabet = part; // Pick the first non-numeric string
            } else if (number === null && !isNaN(part)) {
                number = parseInt(part, 10); // Pick the first valid number
            }
        });

        if (!alphabet || number === null) {
            logger.error(`Parsing error in card at index ${id}: Invalid format for input string.`);
            return { id, alphabet: null, number: null, errors: ['Invalid format for input string.'] };
        }
        return { id, alphabet, number, errors: [] };

    } else if (Array.isArray(card)) {
        // Handle arrays in any order
        let alphabet = null, number = null;

        card.forEach(item => {
            if (!alphabet && typeof item === 'string') {
                alphabet = item;
            } else if (number === null && typeof item === 'number') {
                number = item;
            }
        });

        if (!alphabet || number === null) {
            logger.error(`Parsing error in card at index ${id}: Invalid format for input array.`);
            return { id, alphabet: null, number: null, errors: ['Invalid format for input array.'] };
        }
        return { id, alphabet, number, errors: [] };

    } else if (typeof card === 'object' && card !== null) {
        // Handle objects with dynamic keys in any order
        let alphabet = null, number = null;

        Object.values(card).forEach(value => {
            if (!alphabet && typeof value === 'string') {
                alphabet = value;
            } else if (number === null && typeof value === 'number') {
                number = value;
            }
        });

        if (!alphabet || number === null) {
            logger.error(`Parsing error in card at index ${id}: Invalid format for input object.`);
            return { id, alphabet: null, number: null, errors: ['Invalid format for input object.'] };
        }

        return { id, alphabet, number, errors: [] };

    } else {
        // Handle invalid formats
        logger.error(`Parsing error in card at index ${id}: Unknown input type and format.`);
        return { id, alphabet: null, number: null, errors: ['Unknown input type and format.'] };
    }
};


// Validation function
const validateCards = (cards) => {
    return cards.map(card => {

        // Skip cards with an existing input error
        if (card.alphabet === null && card.number === null) {
            return card;
        }

        let validationResult = { ...card }; // Copy the card to keep it intact

        // Validate alphabet
        if (card.alphabet === null || typeof card.alphabet !== 'string' || card.alphabet.length !== 1 || card.alphabet < 'A' || card.alphabet > 'Z') {
            if (!card.errors) card.errors = [];
            card.errors.push('Card must have a single Alphabet A-Z.');
            logger.error(`Validation error in card at index ${card.id}: Card must have a single Alphabet A-Z.`);
        }

        // Validate number
        if (card.number === null || typeof card.number !== 'number' || card.number < 0 || card.number > 9 || !Number.isInteger(card.number)) {
            if (!card.errors) card.errors = [];
            card.errors.push('Number must be between 0-9.');
            logger.error(`Validation error in card at index ${card.id}: Number must be between 0-9.`);
        }

        // Validate rule: if one face of the card is a “D” the other side must be a “3”.
        if (card.alphabet === "D" && card.number !== 3) {
            if (!card.errors) card.errors = [];
            card.errors.push(`Card "D" must have the number 3.`);
            logger.error(`Validation error in card at index ${card.id}: Card "D" must have the number 3.`);
        }

        return validationResult;
    });
};

// Start Server
app.listen(PORT, () => {
    logger.info(`Server running on http://localhost:${PORT}`);
});
