const net = require('net');
const { parseHTML } = require('./parser');

class Request {

  constructor(options){
    this.method = options.method || 'GET';
    this.host = options.host;
    this.port = options.port || 80;
    this.path = options.path || '/';
    this.body = options.body || {};
    this.headers = options.headers || {};
    if(!this.headers['Content-Type']){
      this.headers['Content-Type'] = 'application/x-www-form-urlencoded';
    }

    if(this.headers['Content-Type'] === 'application/json'){
      this.bodyText = JSON.stringify(this.body);
    }else if(this.headers['Content-Type'] === 'application/x-www-form-urlencoded'){
      this.bodyText = Object.keys(this.body).map(key=>`${key}=${encodeURIComponent(this.body[key])}`).join('&');
    }

    this.headers['Content-Length'] = this.bodyText.length;
  }

  send(connection){
    // ...
    return new Promise((resolve, reject)=>{
      const parse = new ResponseParser();
      if(!connection){
        connection = net.createConnection({
          host: this.host,
          port: this.port
        }, ()=>{
          connection.write(this.toString())
        })
      }else{
        connection.write(this.toString())
      }

      connection.on('data', (data)=>{
        console.log('data:');
        console.log(data.toString());
        parse.receive(data.toString());
        if(parse.isFinished){
          resolve(parse.response);
          connection.end();
        }
      })

      connection.on('error', (error)=>{
        console.error('error', error.toString());
        reject(error);
        connection.end();
      })
    })
  }

  toString(){
    return `${this.method} ${this.path} HTTP/1.1\r
${Object.keys(this.headers).map(key=>`${key}:${this.headers[key]}`).join('\r\n')}\r
\r
${this.bodyText}`;
  }
}

class ResponseParser {
  constructor(){
    this.current = this.waitingStatusLine;
    this.statusLine = '';
    this.headers = {};
    this.headerName = '';
    this.headerValue = '';
    this.bodyParser = null;
  }

  get isFinished(){
    return this.bodyParser && this.bodyParser.isFinished;
  }

  get response(){
    this.statusLine.match(/HTTP\/1.1 ([0-9]+) ([\s\S]+)/);
    return {
      statusCode: RegExp.$1,
      statusText: RegExp.$2,
      headers: this.headers,
      body: this.bodyParser.content.join('')
    }
  }

  end(){
    return this.end;
  }

  waitingStatusLine(char){
    if(char === '\r'){
      return this.waitingStatusEnd;
    }else{
      this.statusLine += char;
    }
    return this.waitingStatusLine;
  }

  waitingStatusEnd(char){
    if(char === '\n'){
      return this.waitingHeadName;
    }
    return this.waitingHeadName(char);
  }

  waitingHeadName(char){
    if(char === ':'){
      return this.waitingHeadSpace;
    }else if(char === '\r'){
      return this.waitingHeadsEnd;
    }else{
      this.headerName += char;
    }
    return this.waitingHeadName;
  }

  waitingHeadSpace(char){
    if(char === ' '){
      return this.waitingHeadValue;
    }
    console.error('waitingHeadSpace state error');
    return this.end;
  }

  waitingHeadValue(char){
    if(char === '\r'){
      this.headers[this.headerName] = this.headerValue;
      this.headerName = '';
      this.headerValue = '';
      return this.waitingHeadLineEnd;
    }else{
      this.headerValue += char;
    }
    return this.waitingHeadValue;
  }

  waitingHeadLineEnd(char){
    if(char === '\n'){
      return this.waitingHeadName;
    }
    return this.waitingHeadName(char);
  }

  waitingHeadsEnd(char){
    if(this.headers['Transfer-Encoding'] === 'chunked'){
      this.bodyParser = new TrunkedBodyParse();
    }
    if(char === '\n'){
      return this.waitingBody;
    }
    return this.waitingBody(char);
  }

  waitingBody(char){
    this.bodyParser.receiveChar(char);
    return this.waitingBody;
  }

  receive(chunk){
    for (let i = 0; i < chunk.length; i++) {  
      this.receiveChar(chunk.charAt(i));
    }
  }

  receiveChar(char){
    this.current = this.current(char);
  }
}

class TrunkedBodyParse{
  constructor(){
    this.length = 0;
    this.content = [];
    this.isFinished = false;
    this.current = this.waitingLength;
  }

  end(){
    return this.end;
  }

  waitingLength(char){
    if(char === '\r'){
      if(this.length === 0){
        this.isFinished = true;
        return this.end;
      }
      return this.waitingLengthLineEnd;
    }else{
      this.length *= 16;
      this.length += parseInt(char, 16);
    }
    return this.waitingLength;
  }

  waitingLengthLineEnd(char){
    if(char === '\n'){
      return this.waitingTrunk;
    }
    return this.waitingTrunk(char);
  }

  waitingTrunk(char){
    this.content.push(char);
    this.length--;
    if(this.length === 0){
      return this.waitingNewLine;
    }
    return this.waitingTrunk;
  }

  waitingNewLine(char){
    if(char === '\r'){
      return this.waitingNewLineEnd;
    }
    console.error('waitingNewLine statue error');
    return this.end;
  }

  waitingNewLineEnd(char){
    if(char === '\n'){
      return this.waitingLength;
    }
    return this.waitingLength(char);
  }
  
  receiveChar(char){
    this.current = this.current(char);
  }
}

void async function(){
  const request = new Request({
    method: 'POST',
    host: '127.0.0.1',
    port: '8080',
    path: '/',
    headers: {
      ['X-Foo2']: 'customized'
    },
    body: {
      name: 'Black Master'
    }
  });

  const response = await request.send();

  parseHTML(response.body);
}();

