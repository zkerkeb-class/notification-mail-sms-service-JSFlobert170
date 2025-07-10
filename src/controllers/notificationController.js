const sgMail = require('@sendgrid/mail');
const twilio = require('twilio');
const { Expo } = require('expo-server-sdk');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const clientTwilio = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const expo = new Expo();

// File d'attente pour les notifications programmées
const scheduledEmails = [];
const scheduledSMS = [];

// Fonction pour normaliser la date au début de la minute
function normalizeToStartOfMinute(date) {
  const normalized = new Date(date);
  normalized.setSeconds(0);
  normalized.setMilliseconds(0);
  return normalized;
}

// Fonction pour vérifier et envoyer les emails programmés
function checkScheduledEmails() {
  const now = normalizeToStartOfMinute(new Date());
  console.log('Vérification des emails programmés à:', now.toISOString());
  
  // Filtrer les emails qui doivent être envoyés maintenant
  const emailsToSend = scheduledEmails.filter(email => {
    const emailDate = normalizeToStartOfMinute(new Date(email.scheduledDate));
    return emailDate.getTime() === now.getTime();
  });

  // Retirer ces emails de la file d'attente
  emailsToSend.forEach(email => {
    const index = scheduledEmails.indexOf(email);
    if (index > -1) {
      scheduledEmails.splice(index, 1);
    }
  });

  // Envoyer les emails
  emailsToSend.forEach(async (email) => {
    try {
      console.log(`Envoi de l'email programmé à ${email.to} pour ${email.scheduledDate}`);
      await sgMail.send({
        to: email.to,
        from: email.from,
        subject: email.subject,
        text: email.text,
        html: email.html
      });
      console.log(`Email programmé envoyé avec succès à ${email.to}`);
    } catch (error) {
      console.error(`Erreur lors de l'envoi de l'email programmé à ${email.to}:`, error);
    }
  });
}

// Fonction pour vérifier et envoyer les SMS programmés
function checkScheduledSMS() {
  const now = normalizeToStartOfMinute(new Date());
  console.log('Vérification des SMS programmés à:', now.toISOString());
  
  // Filtrer les SMS qui doivent être envoyés maintenant
  const smsToSend = scheduledSMS.filter(sms => {
    const smsDate = normalizeToStartOfMinute(new Date(sms.scheduledDate));
    return smsDate.getTime() === now.getTime();
  });

  // Retirer ces SMS de la file d'attente
  smsToSend.forEach(sms => {
    const index = scheduledSMS.indexOf(sms);
    if (index > -1) {
      scheduledSMS.splice(index, 1);
    }
  });

  // Envoyer les SMS
  smsToSend.forEach(async (sms) => {
    try {
      console.log(`Envoi du SMS programmé à ${sms.to} pour ${sms.scheduledDate}`);
      await clientTwilio.messages.create({
        body: sms.body,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: sms.to
      });
      console.log(`SMS programmé envoyé avec succès à ${sms.to}`);
    } catch (error) {
      console.error(`Erreur lors de l'envoi du SMS programmé à ${sms.to}:`, error);
    }
  });
}

// Vérifier les notifications programmées toutes les 30 secondes
setInterval(() => {
  checkScheduledEmails();
  checkScheduledSMS();
}, 30000);

// Démarrer la vérification immédiatement au lancement du service
checkScheduledEmails();
checkScheduledSMS();

exports.sendEmail = async (req, res, next) => {
  try {
    const { to, subject, text, html, scheduledDate } = req.body;
    
    if (!subject || (!text && !html)) {
      return res.status(400).json({ 
        message: 'Paramètres manquants',
        details: {
          subject: !subject ? 'Sujet manquant' : null,
          content: (!text && !html) ? 'Contenu (text ou html) manquant' : null
        }
      });
    }

    // Normaliser la date au début de la minute
    const normalizedDate = scheduledDate ? normalizeToStartOfMinute(new Date(scheduledDate)) : new Date();

    // Créer l'email
    const email = {
      to: 'flobert.johnson.idf@gmail.com',
      from: process.env.SENDGRID_FROM_EMAIL || 'flobert.johnson.idf@gmail.com',
      subject,
      text,
      html,
      scheduledDate: normalizedDate.toISOString()
    };

    // Si une date est spécifiée et elle est dans le futur
    if (scheduledDate && normalizedDate > new Date()) {
      scheduledEmails.push(email);
      console.log(`Email programmé pour ${email.to} à ${normalizedDate.toISOString()}`);
      
      res.status(202).json({ 
        message: 'Email programmé avec succès',
        scheduledDate: normalizedDate.toISOString()
      });
    } else {
      // Sinon, envoyer immédiatement
      await sgMail.send(email);
      console.log(`Email envoyé immédiatement à ${email.to}`);
      
      res.status(200).json({ 
        message: 'Email envoyé avec succès'
      });
    }
  } catch (error) {
    console.error('Erreur lors de la préparation/envoi de l\'email:', error);
    next(error);
  }
};

exports.sendSMS = async (req, res, next) => {
  try {
    const { to, body, scheduledDate } = req.body;
    
    if (!body) {
      return res.status(400).json({ 
        message: 'Paramètres manquants',
        details: {
          to: '+33783790954', //!to ? 'Numéro de téléphone manquant' : null,
          body: !body ? 'Contenu du message manquant' : null
        }
      });
    }

    // Normaliser la date au début de la minute
    const normalizedDate = scheduledDate ? normalizeToStartOfMinute(new Date(scheduledDate)) : new Date();

    // Créer le SMS
    const sms = {
      body,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: '+33783790954',
      scheduledDate: normalizedDate.toISOString()
    };

    // Si une date est spécifiée et elle est dans le futur
    if (scheduledDate && normalizedDate > new Date()) {
      scheduledSMS.push(sms);
      console.log(`SMS programmé pour ${sms.to} à ${normalizedDate.toISOString()}`);
      
      res.status(202).json({ 
        message: 'SMS programmé avec succès',
        scheduledDate: normalizedDate.toISOString()
      });
    } else {
      // Sinon, envoyer immédiatement
      await clientTwilio.messages.create({
        body: sms.body,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: sms.to
      });
      console.log(`SMS envoyé immédiatement à ${sms.to}`);
      
      res.status(200).json({ 
        message: 'SMS envoyé avec succès'
      });
    }
  } catch (error) {
    console.error('Erreur lors de la préparation/envoi du SMS:', error);
    next(error);
  }
};

// exports.sendPushNotification = async (req, res, next) => {
//   try {
//     const { expoPushToken, message } = req.body;
//     if (!expoPushToken || !message) {
//       return res.status(400).json({ message: 'Paramètres manquants' });
//     }
//     if (!Expo.isExpoPushToken(expoPushToken)) {
//       return res.status(400).json({ message: 'Token Expo invalide' });
//     }

//     const messages = [{
//       to: expoPushToken,
//       sound: 'default',
//       body: message,
//       data: { message },
//     }];

//     const chunks = expo.chunkPushNotifications(messages);
//     const tickets = [];

//     for (const chunk of chunks) {
//       const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
//       tickets.push(...ticketChunk);
//     }

//     res.status(200).json({ message: 'Notification push envoyée', tickets });
//   } catch (error) {
//     next(error);
//   }
// };
