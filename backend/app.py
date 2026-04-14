from flask import Flask
from flask_cors import CORS
from routes.chat import chat_bp
from routes.session import session_bp

app = Flask(__name__)
CORS(app, origins=["*"])

app.register_blueprint(chat_bp, url_prefix="/api")
app.register_blueprint(session_bp, url_prefix="/api")

@app.route("/health")
def health():
    return {"status": "ok"}, 200

if __name__ == "__main__":
    app.run(debug=False)
