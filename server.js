require('dotenv').config();

const express = require('express');
const enforce = require('express-sslify');

const path = require('path');
const https = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const Document = require('./Document');

const app = express();
const server = https.createServer(app);

const PORT = process.env.PORT || 4000;

mongoose
  .connect(process.env.DB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
    useCreateIndex: true,
  })
  .then(() => console.log('Connected to DB'))
  .catch((error) => console.error(error));

const io = new Server(server);

if (process.env.NODE_ENV === 'production') {
  app.use(enforce.HTTPS({ trustProtoHeader: true }));
  app.use(express.static(path.join(__dirname, 'client/build')));

  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
  });
}

const defaultValue = '';

io.on('connection', (socket) => {
  socket.on('get-document', async (documentId) => {
    const document = await FindOrCreateDocument(documentId);

    socket.join(documentId);
    socket.emit('load-document', document.data);

    socket.on('send-changes', (delta) => {
      socket.broadcast.to(documentId).emit('receive-changes', delta);
    });

    socket.on('save-document', async (data) => {
      await Document.findByIdAndUpdate(documentId, { data });
    });
  });
});

async function FindOrCreateDocument(id) {
  if (id == null) return;

  const document = await Document.findById(id);
  if (document) return document;

  return Document.create({ _id: id, data: defaultValue });
}

server.listen(PORT, () => {
  console.log(`Server running on port: ${PORT}`);
});
