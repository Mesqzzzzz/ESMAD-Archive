from flask import Flask
from flask_cors import CORS
from routes import analytics_bp

app = Flask(__name__)
CORS(app)

app.register_blueprint(analytics_bp, url_prefix='/analytics')

@app.route('/')
def index():
    return "Analytics service is running"

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=3004, debug=True)
