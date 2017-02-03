'use strict';

var client_IDs = [];//["1466584765725","1466584765726"];

const express = require('express');
const SocketServer = require('ws').Server;
const path = require('path');

// var pg = require('pg');
// pg.defaults.ssl = true;
//
// pg.connect(process.env.DATABASE_URL, function(err, client, done) {
//    client.query('SELECT * FROM onlineUsers', function(err, result) {
//       done();
//       if(err) return console.error(err);
//       console.log(result.rows);
//    });
// });

const PORT = process.env.PORT || 3000;
const INDEX = path.join(__dirname, 'indexx.html');

const server = express()
  .use((req, res) => res.sendFile(INDEX) )
  .listen(PORT, () => console.log(`Listening on ${ PORT }`));

const wss = new SocketServer({ server });

//---------
function SenddDataToClient(msg, client_ID){
  var opponentPlayer = null;
  switch (client_ID) {
    case client_IDs[0]: opponentPlayer = client_IDs[1];
      break;
    case client_IDs[1]: opponentPlayer = client_IDs[0];
      break;
  }

  wss.clients.forEach((client) => {
      //console.log("Client ID ::"+client.clientId);
      try {
          var json = JSON.parse(msg);
          console.log("Message :");
          console.log(json.data);

          if(json.data != 'ping'){
            if(client.clientId == opponentPlayer){
                var resData = JSON.stringify({"YourID" : client_ID+"", "opponentPlayer": opponentPlayer+"", "Box": json.data});
                client.send(resData);
            }
          }

      } catch (e) {
          console.log('This doesn\'t look like a valid JSON: ', msg);
          return;
      }

  });

}
//---------
wss.on('connection', (ws) => {
  ws.clientId = new Date().getTime();//Setting id for each client
  client_IDs.push(ws.clientId);

  console.log('Client connected --- ID :'+ws.clientId);

  ws.on('message',(msg) =>{
    console.log("Got msg :::" + msg);
    SenddDataToClient(msg,ws.clientId);
  });

  ws.on('close', () => {
      console.log('Client disconnected');
      var index = client_IDs.indexOf(ws.clientId);
      if (index > -1) {
        client_IDs.splice(index, 1);
        console.log('Client ID successfully removed');
      }else{
        console.log('Client ID remove faild');
      }
  });

});

/*setInterval(() => {
  noOfClients = 0;
  wss.clients.forEach((client) => {
    //client.send(new Date().toTimeString());
    //console.log("Client ID ::"+client.clientId);
    noOfClients++;
  });
  //console.log("# Clients  ::"+noOfClients);
}, 1000);*/
