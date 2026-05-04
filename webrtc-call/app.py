from flask import Flask, render_template, request
from flask_socketio import SocketIO, join_room, emit

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")

rooms = {}

@app.route("/")
def index():
    return render_template("index.html")

@socketio.on("join")
def on_join(data):
    room = data["room"]
    sid = request.sid

    if room not in rooms:
        rooms[room] = []

    # send existing users to new user
    emit("all-users", rooms[room], room=sid)

    rooms[room].append(sid)
    join_room(room)

    # notify others
    emit("user-joined", sid, room=room, include_self=False)

@socketio.on("offer")
def handle_offer(data):
    emit("offer", {
        "offer": data["offer"],
        "sender": request.sid
    }, room=data["target"])

@socketio.on("answer")
def handle_answer(data):
    emit("answer", {
        "answer": data["answer"],
        "sender": request.sid
    }, room=data["target"])

@socketio.on("ice")
def handle_ice(data):
    emit("ice", {
        "candidate": data["candidate"],
        "sender": request.sid
    }, room=data["target"])

@socketio.on("chat-message")
def handle_chat_message(data):
    emit("chat-message", {
        "message": data["message"],
        "sender": request.sid
    }, room=data["room"], include_self=False)

@socketio.on("disconnect")
def on_disconnect():
    sid = request.sid
    for room in rooms:
        if sid in rooms[room]:
            rooms[room].remove(sid)
            emit("user-left", sid, room=room)

if __name__ == "__main__":
    def start_localtunnel():
        import subprocess
        try:
            print("Starting localtunnel as a fallback...")
            process = subprocess.Popen(
                "npx --yes localtunnel --port 5000",
                shell=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True
            )
            for line in process.stdout:
                if "your url is:" in line:
                    url = line.split("is:")[1].strip()
                    print("=" * 50)
                    print(f"🌍 PUBLIC LINK: {url}")
                    print("Send this link to your friends to join the call!")
                    print("=" * 50)
                    break
        except Exception as e:
            print(f"Could not start localtunnel: {e}")

    try:
        from pyngrok import ngrok
        public_url = ngrok.connect(5000)
        print("=" * 50)
        print(f"🌍 PUBLIC LINK: {public_url.public_url}")
        print("Send this link to your friends to join the call!")
        print("=" * 50)
    except Exception as e:
        print(f"Could not start ngrok: {e}")
        import threading
        threading.Thread(target=start_localtunnel, daemon=True).start()

    socketio.run(app, host="0.0.0.0", port=5000, allow_unsafe_werkzeug=True)