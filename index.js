'use strict';

var client_IDs = [];//["1466584765725","1466584765726"];

const express = require('express');
const SocketServer = require('ws').Server;
const path = require('path');

//Enable followings of google account via browser
// https://www.google.com/settings/security/lesssecureapps
// https://accounts.google.com/b/0/displayunlockcaptcha

var nodemailer = require("nodemailer");

var smtpTransport = nodemailer.createTransport("SMTP",{
   service: "Gmail",  // sets automatically host, port and connection security settings
   auth: {
       user: "sameerabuzzflow@gmail.com",
       pass: "buzz.123"
   }
});

//Herku mail client needed credit card
/*var helper = require('sendgrid').mail;
var from_email = new helper.Email('test@example.com');
var to_email = new helper.Email('sameerabuzzflow@gmail.com');
var subject = 'Hello World from the SendGrid Node.js Library!';
var content = new helper.Content('text/plain', 'Hello, Email!');
var mail = new helper.Mail(from_email, subject, to_email, content);

var sg = require('sendgrid')(process.env.SENDGRID_API_KEY);
var request = sg.emptyRequest({
  method: 'POST',
  path: '/v3/mail/send',
  body: mail.toJSON(),
});
*/

var pg = require('pg');
pg.defaults.ssl = true;

pg.connect(process.env.DATABASE_URL, function(err, client, done) {
   client.query('SELECT * FROM onlineUsers', function(err, result) {
      done();
      if(err) return console.error(err);
      console.log(result.rows);
   });
});

const PORT = process.env.PORT || 3000;
const INDEX = path.join(__dirname, 'indexx.html');

const server = express() //tutorial: http://expressjs.com/en/api.html#req.query
  .use((req, res) => {   //http://stackoverflow.com/questions/6912584/how-to-get-get-query-string-variables-in-express-js-on-node-js
    
    var requestType = req.query.type;
    console.log("req :: "+ requestType);//extarct query paramters like this url====> http://localhost:3000/search?q=tobi+ferret
  
    if(requestType == "getcode"){
      var email = req.query.para1;
      console.log("Request new code :> Email : "+email);
      var newId = getCode();

      res.writeHead(201, {"Content-Type": "application/json"});
      
      var json = JSON.stringify({ 
        request: requestType, 
        code: newId,
        email: email
      });
      res.end(json);

      sendEmail(requestType, email, newId);
      
    }else if(requestType == "newmsg"){
      console.log("New msg");
      var msgContent = {sender:req.query.no, msg: req.query.msg};  

      res.writeHead(200, {"Content-Type": "application/json"});
      
      var json = JSON.stringify({ 
        content: msgContent, 
        status: "sent"
      });
      res.end(json);
      SenddDataToClient(msgContent, "all");
    }else{
      res.header('Content-type', 'text/html');
      res.end('<h1>Unauthorized request:'+req.query.q+'</h1>');  
    }

    

    //console.log(req);
    //res.json(req.body);

    
    
    
    
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
  ws.clientId = getCode();
  client_IDs.push(ws.clientId);

  console.log('Client connected --- ID :'+ws.clientId);

  ws.on('message',(msg) =>{

    try{
      var data = JSON.parse(msg);  
      console.log(data);

      if(data.type == "ping"){
        SenddDataToClient("pong",ws.clientId);    
      }else{
        console.log(data.type);
        SenddDataToClient("pong",ws.clientId);    
      }

      
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


function getCode(){
  var id = new Date().getTime();//Setting id for each client
  return id;
}

function sendEmail(equestType, email, values){

  console.log("Sending email ...");

  if(equestType == "getcode"){
  
    //Sending email -start
    smtpTransport.sendMail({  //email options
       from: "Sender Name <sameerabuzzflow@gmail.com>", // sender address.  Must be the same as authenticated user if using GMail.
       to: "Receiver Name <"+email+">", // receiver
       subject: "Read SMS online Support", // subject
       text: "Your code "+ values// body
    }, function(error, response){  //callback
       if(error){
           console.log("Error:"+error);
       }else{
           console.log("Message sent: " + response.message);
       }
       
       smtpTransport.close(); // shut down the connection pool, no more messages.  Comment this line out to continue sending emails.
    });

    //Heroku mail client
    /*sg.API(request, function(error, response) {
      console.log(response.statusCode);
      console.log(response.body);
      console.log(response.headers);
    });
    */

    //Sending email -end

  }
}