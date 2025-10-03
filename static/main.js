var socket = io();
var msgs = document.getElementById("msgs")
var inp = document.getElementById("inp")
// Basic initialization
var crypt = new Crypt();
var rsa = new RSA();

// Increase amount of entropy
var entropy = 'Random string, integer or floatdsdsdsaddrhewrdfhuewhfrceghfcghjsdefcghhjfcghyhjesdwgh';
var crypt = new Crypt({ entropy: entropy });
var rsa = new RSA({ entropy: entropy });

var publicKey;
var privateKey;

rsa.generateKeyPair(function(keyPair) {
    // Callback function receives new 1024 bit key pair as a first argument
    publicKey = keyPair.publicKey;
    privateKey = keyPair.privateKey;
}, 1024);


function tx(msg) {
    let encrypted = encryptText(msg,publicKey);
    socket.emit('message', {data: encrypted});
}

function rx(msg) {
    let decrypted = crypt.decrypt(privateKey, msg);

    // Get decrypted message
    return message = decrypted.message;
}

socket.on('connect', function() {
    console.log('Connected to server');
    
});

socket.on('my_response', function(msg) {
    console.log('Received response:', msg.data);
});
socket.on('message', function(msg) {
    let m = document.createElement("div")
    m.innerText = rx(msg.data);
    msgs.appendChild(m)
});


let inpTimeout;
inp.onkeydown = (e) =>{
    if(e.keyCode == 13) {
        tx(inp.value)
        inp.value = ""
    } else {
        if (inpTimeout) {
            clearTimeout(inpTimeout);
        } else {
            socket.emit('typing', true);
        }
        inpTimeout = setTimeout(() => {
            socket.emit('typing', false);
            inpTimeout = null;
        },3000)
        
    }
}
