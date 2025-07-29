from flask import Flask, render_template, jsonify, request, send_from_directory, redirect, url_for
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from flask_mail import Mail, Message
from datetime import datetime

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key'
app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+pymysql://root:anurag%40panda@localhost:3306/neurofit_db'
# Mail configuration
app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = 'anurag.panda.pydev@gmail.com'      # change to your email
app.config['MAIL_PASSWORD'] = 'anurag@pydev'         # use app password for Gmail

db = SQLAlchemy(app)
login_manager = LoginManager(app)
mail = Mail(app)

# Database models
class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(120), nullable=False)

class HealthData(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    timestamp = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    heart_rate = db.Column(db.Float)
    spo2 = db.Column(db.Float)
    brain_wave = db.Column(db.JSON)
    mood_score = db.Column(db.Float)

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('index'))

@app.route('/dashboard')
@login_required
def dashboard():
    return render_template('dashboard.html', user=current_user)

@app.route('/health-data')
@login_required
def health_data():
    return render_template('health_data.html', user=current_user)

@app.route('/meditation')
@login_required
def meditation():
    return render_template('meditation.html', user=current_user)

@app.route('/api/health-data', methods=['POST'], endpoint='api_health_data')
def receive_health_data():
    data = request.json
    # Process incoming BLE data
    return jsonify({"status": "success"})

@app.route('/api/meditation/status', methods=['GET'])
def get_meditation_status():
    # Return current meditation metrics
    return jsonify({
        "brainwaves": {"alpha": 0.8, "beta": 0.4, "theta": 0.6},
        "currentState": "Calm",
        "sessionDuration": 300
    })

@app.route('/api/health-data/history', methods=['GET'])
def get_health_history():
    start_date = request.args.get('start')
    end_date = request.args.get('end')
    # Query and return historical health data
    return jsonify({"data": []})

@app.route('/static/audio/<filename>')
def serve_audio(filename):
    return send_from_directory('static/audio', filename)

@app.route('/static/audio/guidance/<filename>')
def serve_guidance_audio(filename):
    return send_from_directory('static/audio/guidance', filename)

@app.route('/login', methods=['POST'])
def login():
    email = request.form.get('email')
    password = request.form.get('password')
    user = User.query.filter_by(email=email).first()
    if user and user.password == password:  # In production, use proper password hashing
        login_user(user)
        return redirect(url_for('dashboard'))
    return redirect(url_for('index'))

@app.route('/signup', methods=['POST'])
def signup():
    username = request.form.get('username')
    email = request.form.get('email')
    password = request.form.get('password')

    # Check if username already exists
    existing_user = User.query.filter_by(username=username).first()
    if existing_user:
        # Render index with error message
        return render_template('index.html', error="Username already taken. Please choose another.")

    user = User(username=username, email=email, password=password)  # In production, hash the password
    db.session.add(user)
    db.session.commit()
    login_user(user)
    return redirect(url_for('dashboard'))

@app.route('/reset-db')
def reset_db():
    db.drop_all()
    db.create_all()
    return "Database reset. All tables dropped and recreated."

@app.route('/api/emergency-alert', methods=['POST'])
@login_required
def emergency_alert():
    data = request.json
    email = data.get('email')
    message = data.get('message')
    location = data.get('location')
    subject = "NeuroFit Emergency Alert"
    body = f"{message}\nLocation: {location}\nUser: {current_user.username} ({current_user.email})"

    # Replace with your Apps Script web app URL
    APPSCRIPT_URL = "https://script.google.com/macros/s/AKfycby1GQmKAt410LKFz3kDWmNAQT6OQkTXU3zfn3EZvHDRZObAfgLfyh1M6eQbelskakCE/exec"

    payload = {
        "email": email,
        "subject": subject,
        "body": body
    }

    import requests
    try:
        resp = requests.post(APPSCRIPT_URL, json=payload)
        if resp.status_code == 200:
            status = "Emergency alert sent via Google Apps Script!"
        else:
            status = "Failed to send email via Apps Script."
    except Exception as e:
        print("Apps Script send error:", e)
        status = "Failed to send email."
    return jsonify({"status": status})

@login_manager.unauthorized_handler
def unauthorized():
    return redirect(url_for('index'))

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)
