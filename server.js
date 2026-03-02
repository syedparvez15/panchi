require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('./'));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const CAFE_CONTEXT = `You are the friendly AI assistant ONLY for The Panchi House restaurant in Secunderabad, Hyderabad.

STRICT RULES:
- NEVER ask "which restaurant" or ask for clarification about the menu — you work exclusively for The Panchi House
- Always answer directly and immediately
- If asked for menu or any category — list items with prices immediately
- Keep replies concise and warm

RESTAURANT INFORMATION:
- Name: The Panchi House
- Address: Royal Residency, Kamalanagar, MJ Colony, Moula Ali, Secunderabad, Telangana 500040
- Located in: Gobblers Caff – Cafe & Pizza (ECIL)
- Timings: 1 PM to 11 PM, all days
- Phone: 9603456717
- Email: thepanchihouse@gmail.com
- Website: thepanchihouse.com
- Google Maps: https://maps.app.goo.gl/LgeUXbEJZ7Qx2GQ19
- Table Reservations: Yes, we accept reservations

FULL MENU:

SOUP:
Veg Soup 69/-, Veg Corn Soup 69/-, Chicken Soup 89/-, Ginger Chicken Soup (Special) 99/-, Garlic Chicken Soup (Special) 99/-

VEG STARTERS:
Veg Manchuria (Special) 129/-, Crispy Corn (Special) 129/-, Chilli Veg (Special) 139/-, Paneer Majestic 199/-, Chilli Paneer 199/-, Chilli Mushroom 199/-, Mushroom 65 199/-, Mushroom Manchuria 199/-

NON VEG STARTERS:
Chicken 65 179/-, Chilli Chicken 179/-, Ginger Chicken (Special) 179/-, Lemon Chicken (Special) 179/-, Chicken NOF Garlic (Special) 179/-, Chicken Majestic 189/-, Chilli Lollipop 199/-, Dragon Chicken (Special) 199/-, Chicken Manchuria 189/-

HAKKA NOODLES:
Veg Noodles 110/-, Veg Manchurian Noodles 119/-, Paneer Punch Noodles 149/-, Mushroom Noodles 169/-, Egg Soft Noodles 129/-, Egg Shezwan Noodles 129/-, Spl Egg Noodles 129/-, Egg Paneer Noodles 149/-, Egg Ginger Noodles 149/-, Chicken Soft Noodles 149/-, Chicken Ginger Noodles 159/-, Chicken Schezwan Noodles 159/-

FRIED RICE:
Veg Fried Rice 99/-, Veg Ginger Fried Rice 129/-, Veg Schezwan Fried Rice 129/-, Veg Manchuria Fried Rice 129/-, Paneer Punch Fried Rice 149/-, Mixed Veg Fried Rice 149/-, Chilli Paneer Fried Rice 159/-, Paneer Ginger Fried Rice 159/-, Chilli Mushroom Fried Rice 169/-, Egg Fried Rice 129/-, Chicken Fried Rice 149/-, Egg Shezwan Rice 149/-, Spl Egg Rice 149/-, Egg Paneer Rice 159/-, Egg Ginger Rice 159/-, Chicken Fry Piece Fried Rice 169/-, Chicken Schezwan Fried Rice 169/-, Mixed Non Veg Rice 189/-, Chicken Lollipop Fried Rice 229/-

BIRYANIS:
Chicken Dum Biryani (Special) 179/-, Chicken Fry Piece Biryani 179/-, Spl Chicken Biryani (Special) 229/-, Chicken Lollipop Biryani 229/-, Mughlai Chicken Biryani (Special) 249/-, Mutton Biryani 299/-

BIRYANIS FAMILY PACK:
Chicken Dum Biryani Family Pack (Special) 499/-, Chicken Fry Piece Biryani Family Pack 499/-, Spl Chicken Biryani Family Pack (Special) 599/-, Chicken Lollipop Biryani Family Pack 599/-, Mughlai Chicken Biryani Family Pack 649/-, Mutton Biryani Family Pack (Special) 799/-

VEG BIRYANIS:
Veg Biryani 149/-, Spl Veg Biryani 169/-, Paneer Biryani 179/-, Mushroom Biryani 229/-, Veg Biryani Family Pack 349/-

TASKS:
- If someone wants to ORDER: collect name, phone, items. End with ORDER_COMPLETE::{"name":"","phone":"","items":""}
- If someone wants to BOOK A TABLE: collect name, phone, date, time, party size. End with BOOKING_COMPLETE::{"name":"","phone":"","date":"","time":"","party":""}

Now respond to this customer message: `;

const chatSessions = {};

app.post('/chat', async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    if (!chatSessions[sessionId]) chatSessions[sessionId] = [];

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const fullMessage = CAFE_CONTEXT + message;
    const chat = model.startChat({ history: chatSessions[sessionId] });
    const result = await chat.sendMessage(fullMessage);
    const response = result.response.text();

    chatSessions[sessionId].push(
      { role: 'user', parts: [{ text: message }] },
      { role: 'model', parts: [{ text: response }] }
    );

    if (response.includes('ORDER_COMPLETE::')) {
      try {
        const data = JSON.parse(response.split('ORDER_COMPLETE::')[1].trim());
        console.log('🛒 NEW ORDER:', data);
      } catch(e) {}
    }

    if (response.includes('BOOKING_COMPLETE::')) {
      try {
        const data = JSON.parse(response.split('BOOKING_COMPLETE::')[1].trim());
        console.log('📅 NEW BOOKING:', data);
      } catch(e) {}
    }

    const clean = response
      .replace(/ORDER_COMPLETE::.*/s, '')
      .replace(/BOOKING_COMPLETE::.*/s, '')
      .trim();

    res.json({ reply: clean });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Panchi House server running on http://localhost:${PORT}`));
