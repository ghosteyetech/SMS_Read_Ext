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

const server = express() //tutorial: http://expressjs.com/en/api.html#req.query
  .use((req, res) => {   //http://stackoverflow.com/questions/6912584/how-to-get-get-query-string-variables-in-express-js-on-node-js
    
    console.log("req :: "+ req.query.q);//extarct query paramters like this url====> http://localhost:3000/search?q=tobi+ferret
    
    var msgContent = {sender:"me", msg: req.query.q};

  //console.log(req);
  //res.json(req.body);

    res.header('Content-type', 'text/html');
    res.end('<h1>Hello, Secure World!'+req.query.q+'</h1>');  
    
    SenddDataToClient(msgContent, "all");
    
    //console.log("res:::") ;
    //console.log(res) ;
    //res.sendFile(INDEX);

  })
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
      console.log("Client ID ::"+client.clientId);
      try {

          if(msg == "pong"){
            var resData = JSON.stringify({"YourID" : client_ID+"", "Message": msg});
            client.send(resData);  
          }else{
            var resData = JSON.stringify({"YourID" : client_ID+"", "Sender": msg.sender, "Message": msg.msg});
            client.send(resData);
          }
          
          //var json = JSON.parse(msg);//JSON.parse is use only when deal with var str = '{"foo": "bar"}'; like string. 
                                      //If you have object like var chunk={id:"12",data:"123556",details:{"name":"alan","age":"12"}}; no need to parse
          //console.log("Message :");
          //console.log(json.data);

          /*if(json.data == 'ping'){
            var resData = JSON.stringify({"YourID" : client_ID+"", "Box": msg});
            client.send(resData);
          }*/

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

    try{
      var data = JSON.parse(msg);  
      console.log(data);
      SenddDataToClient("pong",ws.clientId);  
    }catch (e){
      console.log("Failed to parse");
      console.log(msg);
      return;
    }
    

    // console.log("Got msg :::" + msg);
    // if(msg.data == "ping"){
      
    // }else{
    //   SenddDataToClient(msg,ws.clientId);  
    // }
    
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
