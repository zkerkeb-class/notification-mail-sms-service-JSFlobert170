require('dotenv').config();
const express = require('express');
const notificationRoutes = require('./routes/notificationRoutes');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/notifications', notificationRoutes);

console.log('SendGrid API Key:', process.env.SENDGRID_API_KEY ? 'OK' : 'MANQUANTE');
console.log('Twilio SID:', process.env.TWILIO_ACCOUNT_SID ? 'OK' : 'MANQUANT');
console.log('Twilio Phone:', process.env.TWILIO_PHONE_NUMBER ? 'OK' : 'MANQUANT');
console.log('Twilio token:', process.env.TWILIO_AUTH_TOKEN ? 'OK' : 'MANQUANT');

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
