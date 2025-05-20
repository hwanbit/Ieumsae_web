from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timedelta
import jwt
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Database configuration
app.config['SQLALCHEMY_DATABASE_URI'] = (
    f"mysql+mysqlconnector://{os.getenv('DB_USER')}:{os.getenv('DB_PASSWORD')}@"
    f"{os.getenv('DB_HOST')}/{os.getenv('DB_NAME')}"
)
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY')

db = SQLAlchemy(app)

# User model
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(120), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f'<User {self.username}>'

# # Create tables
# with app.app_context():
#     db.create_all()

# 하드코딩된 관리자 계정 (테스트용)
ADMIN_USERNAME = 'admin'
ADMIN_PASSWORD = 'kopo123'

@app.route('/api/login', methods=['POST'])
# def login():
#     data = request.get_json()
#     username = data.get('username')
#     password = data.get('password')
#
#     user = User.query.filter_by(username=username).first()
#
#     if user and user.password == password:  # In production, use proper password hashing
#         token = jwt.encode({
#             'user_id': user.id,
#             'exp': datetime.utcnow() + timedelta(hours=24)
#         }, app.config['JWT_SECRET_KEY'])
#
#         return jsonify({
#             'token': token,
#             'message': 'Login successful'
#         }), 200

    # 하드코딩된 관리자 계정으로 인증 확인
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if username == ADMIN_USERNAME and password == ADMIN_PASSWORD:
        token = jwt.encode({
            'user_id': 1,  # 임의의 ID 값
            'username': username,
            'is_admin': True,
            'exp': datetime.utcnow() + timedelta(hours=24)
        }, app.config['JWT_SECRET_KEY'])

        return jsonify({
            'token': token,
            'message': 'Login successful',
            'user': {
                'id': 1,
                'username': username,
                'is_admin': True
            }
        }), 200
    
    return jsonify({'message': 'Invalid credentials'}), 401

@app.route('/api/check-auth', methods=['GET'])
def check_auth():
    auth_header = request.headers.get('Authorization')

    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'message': 'Authentication required'}), 401

    token = auth_header.split(' ')[1]

    try:
        payload = jwt.decode(token, app.config['JWT_SECRET_KEY'], algorithms=['HS256'])
        return jsonify({
            'message': 'Authenticated',
            'user': {
                'id': payload.get('user_id'),
                'username': payload.get('username'),
                'is_admin': payload.get('is_admin', False)
            }
        }), 200
    except jwt.ExpiredSignatureError:
        return jsonify({'message': 'Token expired'}), 401
    except jwt.InvalidTokenError:
        return jsonify({'message': 'Invalid token'}), 401

if __name__ == '__main__':
    app.run(debug=True)