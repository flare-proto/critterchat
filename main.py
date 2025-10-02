from flask import Flask, render_template,url_for,session
from flask_socketio import SocketIO, emit
import uuid

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your_secret_key' # Replace with a strong secret key
socketio = SocketIO(app)

channels = []


@app.route('/')
def index():
    return render_template('index.html')

@socketio.on('connect')
def handle_connect():
    session["UID"] = str(uuid.uuid4())
    print('Client connected')
    
    

@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')

@socketio.on('message')
def handle_my_event(data):
    print('Received message:', data)
    emit('my_response', {'data': f'Server received your message! {session["UID"]}'})
    socketio.emit('message', data)
    
@socketio.on('typing')
def typingMsg(data):
    socketio.emit('typing', {"uid":session["UID"],"typ":data})

if __name__ == '__main__':
    socketio.run(app, debug=True,)