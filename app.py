from flask import Flask, send_from_directory
from pathlib import Path

app = Flask(__name__, static_folder=".", static_url_path="")
ROOT = Path(__file__).resolve().parent

@app.get("/")
def index():
    return send_from_directory(ROOT, "index.html")

@app.get("/<path:path>")
def static_files(path):
    target = ROOT / path
    if target.is_file():
        return send_from_directory(ROOT, path)
    return send_from_directory(ROOT, "index.html")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
