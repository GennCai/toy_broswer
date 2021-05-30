const http = require("http");

http.createServer((req, res) => {
    let body = [];
    req.on("error", (err) => {
        console.error(err);
    })
        .on("data", (chunk) => {
            console.log('data: ', chunk.toString());
            body.push(chunk);
        })
        .on("end", () => {
            body = Buffer.concat(body).toString();
            console.log('end: ', body);
            res.writeHead(200, { "Content-Type": "text/html" });
            res.end(`<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta http-equiv="X-UA-Compatible" content="IE=edge"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Document</title>
</head>
<body>
  <h2>Hello World!</h2>
</body>
</html>`);
        });
}).listen("8080");
