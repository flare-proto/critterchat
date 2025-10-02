var socket = io();
var msgs = document.getElementById("msgs")
var inp = document.getElementById("inp")
socket.on('connect', function() {
    console.log('Connected to server');
    socket.emit('message', {data: 'I\'m connected!'});
    
});

socket.on('my_response', function(msg) {
    console.log('Received response:', msg.data);
});
socket.on('message', function(msg) {
    console.log('Received response:', msg.data);
    let m = document.createElement("div")
    m.innerText = msg.data
    msgs.appendChild(m)
});


let inpTimeout;
inp.onkeydown = (e) =>{
    if(e.keyCode == 13) {
        socket.emit('message', {data: inp.value});
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