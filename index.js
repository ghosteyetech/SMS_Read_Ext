'use strict';

var client_IDs = [];//["1466584765725","1466584765726"];

const express = require('express');
const SocketServer = require('ws').Server;
const path = require('path');
var randomstring = require("randomstring");

//Enable followings of google account via browser
// https://www.google.com/settings/security/lesssecureapps
// https://accounts.google.com/b/0/displayunlockcaptcha

var nodemailer = require("nodemailer");

var smtpTransport = nodemailer.createTransport("SMTP",{
   service: "Gmail",  // sets automatically host, port and connection security settings
   auth: {
       user: "sameerabuzzflow@gmail.com",
       pass: "buzz.1234"
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

//console.log("Dtabase URL: "+process.env.DATABASE_URL);
//Should enable posgresql from the dqashboad resources page
//And install psql local machine the use following command to login
//==> heroku pg:psql DATABASE_URL --app sms-reader-ghost-online
//==To see logs via cmd
//===> heroku logs --tail --ps postgres --app sms-reader-ghost-online

//Drop table
/*pg.connect(process.env.DATABASE_URL, function(err, client, done) {
   client.query('DROP TABLE onlineUsers', function(err, result) {
      done();
      if(err) return console.error(err);
      console.log(result.rows);
   });
});*/

//Create table
/*pg.connect(process.env.DATABASE_URL, function(err, client, done) {
   client.query('CREATE TABLE onlineUsers (id BIGINT PRIMARY KEY NOT NULL, email TEXT NOT NULL, mobileid TEXT NOT NULL, extensionid TEXT NOT NULL, tokenauth TEXT NOT NULL)', function(err, result) {
      done();
      if(err) return console.error(err);
      console.log(result.rows);
   });
});

pg.connect(process.env.DATABASE_URL, function(err, client, done) {
   client.query('SELECT * FROM onlineUsers', function(err, result) {
      done();
      if(err){
        return console.error(err);
      } else{
        console.log("Results : ");
        console.log(result.rows);  
      }
      
   });
});
*/

const PORT = process.env.PORT || 3000;
const INDEX = path.join(__dirname, 'indexx.html');

const server = express() //tutorial: http://expressjs.com/en/api.html#req.query
  .use((req, res) => {   //http://stackoverflow.com/questions/6912584/how-to-get-get-query-string-variables-in-express-js-on-node-js
    
    var requestType = req.query.type;
    console.log("req :: "+ requestType);//extarct query paramters like this url====> http://localhost:3000/search?q=tobi+ferret
  
    if(requestType == "getcode"){
      var email = req.query.para1;
      
      var newId_extention = getCode();
      var newId_android = getCode()+getRandomString(3);
      var tokenAuth = randomstring.generate(7);//generate token with mixing numbers

      console.log("Request new code :> Email : "+email+" newId_extention: "+newId_extention+" newId_android: "+newId_android+" Token: "+tokenAuth);

      res.writeHead(201, {"Content-Type": "application/json"});
      
      var json = JSON.stringify({ 
        request: requestType, 
        code: newId_extention+"@"+newId_android+"@"+tokenAuth,
        email: email
      });
      res.end(json);

      insertUserDataToDatabase(newId_extention, email, newId_android, newId_extention, tokenAuth);

      sendEmail(requestType, email, tokenAuth);
      
    }else if(requestType == "newmsg"){
      console.log("New msg");
      var msgContent = {sender:req.query.no, msg: req.query.msg};  
      var receiverId = req.query.auth;

      console.log("Auth Code : "+ req.query.auth);
      console.log("User Email : "+ req.query.email);
      console.log("Number : "+ req.query.no);
      console.log("Message body : "+ req.query.msg);

      res.writeHead(200, {"Content-Type": "application/json"});
      
      var json = JSON.stringify({ 
        content: msgContent, 
        status: "sent"
      });
      res.end(json);
      SenddDataToClient(msgContent, receiverId, "");
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
function SenddDataToClient(type, client_ID, dataObj){
  
  wss.clients.forEach((client) => {
      console.log("Client ID ::"+client.clientId);
      try {

          if(client.clientId == client_ID){

            if(type == "new"){
              var resData = JSON.stringify({ "type" :"new" ,"id" : client_ID+"", "status": dataObj.status });
              client.send(resData); 
            }else if(type == "pong" && client.clientId == client_ID){
              var resData = JSON.stringify({ "type": "pong" ,"id" : client_ID+""});
              client.send(resData);  
            }else if(type == "authVerifyAndroid" && client.clientId == client_ID){
              var resData = null;
              if(dataObj.status == "found"){
                console.log("Client ID chnage from : "+client.clientId+" to "+dataObj.mobileid);
                client.clientId = dataObj.mobileid;
                resData = JSON.stringify({ "type": type ,"id" : client.clientId+"", "status": "ok"});
              }else{
                resData = JSON.stringify({ "type": type ,"id" : client_ID+"", "status": "error"});
              }
              
              client.send(resData);  
            }else if(type == "newtoken" && client.clientId == client_ID){
              var resData = null;
              if(dataObj.status == "ok"){
                
                console.log("Client ID chnage from : "+client.clientId+" to "+dataObj.extensionid);
                client.clientId = dataObj.extensionid;
                resData = JSON.stringify({"type": "newtoken", "status": "ok", "mobileid": data.mobileid+"", "extensionid": dataObj.extensionid+""});
                
              }else{
                resData = JSON.stringify({"type": "newtoken", "status": "error"});
              }

              client.send(resData);
              
            } 


          }

          /*if(msg == "pong" && client.clientId == client_ID){
            var resData = JSON.stringify({"YourID" : client_ID+"", "Message": msg});
            client.send(resData);  
          }else if(msg == "newtoken" && client.clientId == client_ID){
            var resData = JSON.stringify({"Message": "newtoken", "mobileid": data});
            client.send(resData);
          }else if(msg == "auth" && client.clientId == client_ID){
            var resData = JSON.stringify({"YourID" : client_ID+"", "Message": msg});
            client.send(resData);  
          }else if( client.clientId == client_ID){
            var resData = JSON.stringify({"YourID" : client_ID+"", "Sender": msg.sender, "Message": msg.msg});
            client.send(resData);

          }else{
            console.log(msg);
          }*/
          
          //var json = JSON.parse(msg);//JSON.parse is use only when deal with var str = '{"foo": "bar"}'; like string. 
                                      //If you have object like var chunk={id:"12",data:"123556",details:{"name":"alan","age":"12"}}; no need to parse
          //console.log("Message :");
          //console.log(json.data);

          /*if(json.data == 'ping'){
            var resData = JSON.stringify({"YourID" : client_ID+"", "Box": msg});
            client.send(resData);
          }*/

      } catch (e) {
          console.log('This doesn\'t look like a valid JSON: ', e);
          return;
      }

  });

}
//---------
wss.on('connection', (ws) => {
  

  ws.on('message',(msg) =>{

    console.log("WebsockertOnMsg: "+msg);

    try{

      var data = JSON.parse(msg);  
      
      if(data.type == "new" && data.code == "extension"){
        ws.clientId = getCode();
        console.log("New Extension : "+ws.clientId);
        var resObj = {status : "temp"};
        SenddDataToClient("new", ws.clientId, resObj);    
      }else if(data.type == "new" && data.code == "android"){
        ws.clientId = getCode();
        console.log("New Android Client : "+ws.clientId);
        var resObj = {status : "temp"};
        SenddDataToClient("new", ws.clientId, resObj);    
      }else if(data.type == "ping" && ws.clientId != undefined){
        console.log("Sending pong to Client : "+ws.clientId);
        SenddDataToClient("pong",ws.clientId, "");    
      }else if(data.type == "authVerifyAndroid" && data.mobileid != undefined){

        if(ws.clientId == undefined){
          ws.clientId = getCode();
        }

        console.log("==>authVerifyAndroid<<= MobileID : "+data.mobileid+" ExtID: "+data.extensionid+" UEmail: "+data.useremail+" Token: "+data.token);
        
        VerifyUserAuthData("authVerifyAndroid", ws.clientId, data.useremail, data.mobileid, data.extensionid);

      }else if(data.type == "newtoken" && ws.clientId != undefined){
        console.log("Token "+data.token);
        getUserAuthData("token",data.token, ws.clientId);
      }else{
        ws.clientId = getCode();
        client_IDs.push(ws.clientId);
        console.log('Android Client or unauth client connected --- ID :'+ws.clientId);
        var resObj = {status : "temp"};
        SenddDataToClient("new",ws.clientId, resObj);    
      }      

      /*if(data.type == "ping" && ws.clientId != undefined){
        console.log("Sending pong to Client : "+ws.clientId);
        SenddDataToClient("pong",ws.clientId, "");    
      }else if(data.type == "newtoken" && ws.clientId != undefined){
        console.log("Token "+data.token);
        getUserAuthData("token",data.token, ws.clientId);
      }else if(data.type == "auth"){
        ws.clientId = data.code;//getCode();
        client_IDs.push(ws.clientId);
        console.log('Auth Client connected --- ID :'+ws.clientId);
        SenddDataToClient("auth",ws.clientId, "");    
      }else{
        ws.clientId = getCode();
        client_IDs.push(ws.clientId);
        console.log('Android Client or unauth client connected --- ID :'+ws.clientId);
        console.log(data.type);
        SenddDataToClient(data.type,ws.clientId, "");    
      }*/

      
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
      console.log('Client disconnected : '+ws.clientId);
      
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

function getRandomString(len){
  var randomStr = randomstring.generate({
    length: len,
    charset: 'abcdefghijklmnopqrstuvwxyz'
  });

  return randomStr;
}

function insertUserDataToDatabase(id, email, mobile_id, extention_id, tokenAuth){
    pg.connect(process.env.DATABASE_URL, function(err, client, done) {
       client.query('INSERT INTO onlineUsers(id, email, mobileid, extensionid, tokenauth) VALUES ($1, $2, $3, $4, $5)',[id, email, mobile_id, extention_id, tokenAuth], 
        function(err, result) {
          done();
          if(err){
            return console.error(err);
          } else{
            console.log("Results : ");
            console.log(result.rows);  
          }
          
       });
    });
}

function getUserAuthData(para, value, clientId){

  console.log("Para : "+para+" Vlaue : "+value);


  pg.connect(process.env.DATABASE_URL, function(err, client, done) {
       client.query('SELECT * FROM onlineUsers where tokenauth=$1',[value], 
        function(err, result) {
          done();
          if(err){
            SenddDataToClient("newtoken", clientId, {status: "error"});    
            return console.error(err);
          } else{
            console.log("Results : ");
            console.log(result.rows);  
            var results = result.rows;
            
            SenddDataToClient("newtoken", clientId, { status:"ok", extensionid: results[0].extensionid, mobileid: results[0].mobileid});    
          }
          
       });
    });

}

function VerifyUserAuthData(para, clientId, useremail, mobileid, extensionid){

  console.log("Para : "+para+" clientId"+clientId+" useremail"+useremail+" mobileid"+mobileid+" extensionid"+extensionid);


  pg.connect(process.env.DATABASE_URL, function(err, client, done) {
       client.query('SELECT * FROM onlineUsers WHERE email=$1 AND mobileid=$2 AND extensionid=$3',[useremail, mobileid, extensionid], 
        function(err, result) {
          done();
          if(err){
            SenddDataToClient(para, clientId, {status: "error"});    
            return console.error(err);
          } else{
            console.log("Results : ");
            console.log(result.rows);  
            var results = result.rows;
            
            SenddDataToClient(para, clientId, {status: "found", mobileid: results[0].mobileid });    
          }
          
       });
    });

}