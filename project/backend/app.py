from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import text
from datetime import datetime, timedelta
import jwt
from dotenv import load_dotenv
import os
import re
import json
from llama_cpp import Llama

# --------------------------------------------------------------------------
# 1. 환경 변수 및 LLM 모델 로드
# --------------------------------------------------------------------------
load_dotenv()

# GGUF 모델 로드
model_path = os.path.abspath("./EXAONE-3.5-2.4B-Instruct-Q4_K_M.gguf")

if not os.path.exists(model_path):
    raise FileNotFoundError(
        f"LLM 모델 파일을 찾을 수 없습니다. '{model_path}' 경로를 확인해주세요."
    )

llm = Llama(
    model_path=model_path,
    n_ctx=2048,
    n_threads=6,
    n_gpu_layers=1,
    temperature=0.4,
    max_tokens=256,
    top_p=0.9,
    repeat_penalty=1.1,
    verbose=False
)

# --------------------------------------------------------------------------
# 2. Flask 앱 설정
# --------------------------------------------------------------------------
app = Flask(__name__)
CORS(app)

app.config['SQLALCHEMY_DATABASE_URI'] = (
    f"mysql+mysqlconnector://{os.getenv('DB_USER')}:{os.getenv('DB_PASSWORD')}@"
    f"{os.getenv('DB_HOST')}/{os.getenv('DB_NAME')}"
)
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY')

db = SQLAlchemy(app)

# --------------------------------------------------------------------------
# 3. LLM 헬퍼 함수
# --------------------------------------------------------------------------
def create_json_prompt(user_input: str) -> str:
    """JSON 형식 응답을 위한 프롬프트 생성"""
    system_message = """You are an assistant that generates SQL queries and graph types in JSON format.

    DetectionLog Table Schema:
    - detection_class (varchar): 'car' or 'person'
    - date (date), time (time), cam_id (varchar)
    - confidence (float), signal_status (tinyint), event_flag (tinyint)
    - object_id (varchar), id (int), created_at (timestamp)

    You must respond only in the following JSON format:
    {"sql": "SELECT statement", "graph": "pie/bar/line/heatmap", "reason": "Reason for selection"}

    Precautions:
    - Write SQL in a single line.
    - 'graph' must be one of pie, bar, line, or heatmap.
    - No other text is allowed outside the JSON."""

    prompt = f"""[|system|]{system_message}[|endofturn|]
    [|user|]오늘 car 수를 시각화해줘.[|endofturn|]
    [|assistant|]{{"sql": "SELECT COUNT(*) FROM DetectionLog WHERE detection_class = 'car' AND date = CURDATE()", "graph": "bar", "reason": "A bar chart is suitable for representing a single numerical value."}}[|endofturn|]
    [|user|]시간대별 person 탐지 추이를 시각화해줘.[|endofturn|]
    [|assistant|]{{"sql": "SELECT HOUR(time) as hour, COUNT(*) as count FROM DetectionLog WHERE detection_class = 'person' GROUP BY HOUR(time) ORDER BY hour", "graph": "line", "reason": "A line chart is suitable for showing trends over time."}}[|endofturn|]
    [|user|]요일별 시간대별 탐지 패턴을 시각화해줘.[|endofturn|]
    [|assistant|]{{"sql": "SELECT DAYOFWEEK(date) as weekday, HOUR(time) as hour, COUNT(*) as count FROM DetectionLog GROUP BY DAYOFWEEK(date), HOUR(time) ORDER BY weekday, hour", "graph": "heatmap", "reason": "A heatmap is effective for visualizing data density across two dimensions like day of the week and hour."}}[|endofturn|]
    [|user|]{user_input}[|endofturn|]
    [|assistant|]"""
    return prompt

def is_sql_executable(sql: str) -> tuple[bool, str]:
    """SQL 실행 가능 여부 검증"""
    if not sql: return False, "SQL is empty"
    sql_upper = sql.upper()
    if 'SELECT' not in sql_upper: return False, "SELECT clause is missing"
    if 'FROM' not in sql_upper: return False, "FROM clause is missing"
    if 'DETECTIONLOG' not in sql_upper: return False, "Does not use the DetectionLog table"
    dangerous = ['DROP', 'DELETE', 'UPDATE', 'INSERT', 'ALTER', 'CREATE', 'TRUNCATE']
    for keyword in dangerous:
        if keyword in sql_upper: return False, f"Dangerous keyword '{keyword}' included"
    return True, "Executable"

def normalize_graph_type(graph_type: str) -> str:
    """그래프 타입을 표준 형식으로 변환"""
    if not graph_type: return 'bar'
    graph_type = graph_type.lower()
    if any(x in graph_type for x in ['pie', '원형']): return 'pie'
    if any(x in graph_type for x in ['bar', '막대']): return 'bar'
    if any(x in graph_type for x in ['line', '선', '추이']): return 'line'
    if any(x in graph_type for x in ['heatmap', '히트맵']): return 'heatmap'
    return 'bar'

def fix_common_sql_errors(sql: str) -> str:
    """일반적인 SQL 오류 자동 수정"""
    if not sql: return sql
    sql = re.sub(r'SUM\(\*\)', 'COUNT(*)', sql, flags=re.IGNORECASE)
    sql = re.sub(r'CURRENT_DATE\(\)', 'CURDATE()', sql, flags=re.IGNORECASE)
    return sql.rstrip(';').strip()

def parse_json_response(response_text: str) -> dict:
    """JSON 응답 파싱"""
    try:
        start_idx = response_text.find('{')
        end_idx = response_text.rfind('}')
        if start_idx != -1 and end_idx != -1:
            json_str = response_text[start_idx:end_idx + 1]
            parsed = json.loads(json_str)
            return {
                'sql': fix_common_sql_errors(parsed.get('sql', '')),
                'graph_type': normalize_graph_type(parsed.get('graph', 'bar')),
                'reason': parsed.get('reason', '')
            }
        raise ValueError("JSON format not found")
    except (json.JSONDecodeError, ValueError):
        # Fallback: 정규식으로 SQL과 그래프 타입 추출 시도
        sql_match = re.search(r'SELECT.*?(;|$)', response_text, re.IGNORECASE)
        graph_match = re.search(r'["\']?graph["\']?\s*:\s*["\']?(pie|bar|line|heatmap)["\']?', response_text, re.IGNORECASE)
        return {
            'sql': fix_common_sql_errors(sql_match.group(0) if sql_match else ''),
            'graph_type': normalize_graph_type(graph_match.group(1) if graph_match else 'bar'),
            'reason': 'Failed to parse JSON, extracted via fallback.'
        }

def visualize_chain(user_input: str) -> dict:
    """LLM을 호출하여 SQL 생성"""
    if not user_input:
        return {'error': True, 'message': 'Input query is empty.'}
    try:
        prompt = create_json_prompt(user_input)
        response = llm(prompt, max_tokens=256, stop=["[|endofturn|]", "[|user|]"], echo=False)
        response_text = response['choices'][0]['text'].strip()
        result = parse_json_response(response_text)

        if result['sql']:
            is_valid, validation_msg = is_sql_executable(result['sql'])
            if not is_valid:
                result['error'] = True
                result['message'] = f"SQL validation failed: {validation_msg}"
        else:
            result['error'] = True
            result['message'] = "SQL not generated."
        return result
    except Exception as e:
        return {'error': True, 'message': f"An error occurred: {str(e)}"}

# --------------------------------------------------------------------------
# 4. API 라우트 (Endpoints)
# --------------------------------------------------------------------------

# --- 인증 라우트 ---
@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    if username == os.getenv('ADMIN_USERNAME', 'admin') and password == os.getenv('ADMIN_PASSWORD', 'kopo123'):
        token = jwt.encode({
            'user_id': 1, 'username': username, 'is_admin': True,
            'exp': datetime.utcnow() + timedelta(hours=24)
        }, app.config['JWT_SECRET_KEY'])
        return jsonify({'token': token, 'message': 'Login successful'}), 200
    return jsonify({'message': 'Invalid credentials'}), 401

@app.route('/api/check-auth', methods=['GET'])
def check_auth():
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'message': 'Authentication required'}), 401
    token = auth_header.split(' ')[1]
    try:
        payload = jwt.decode(token, app.config['JWT_SECRET_KEY'], algorithms=['HS256'])
        return jsonify({'message': 'Authenticated', 'user': payload}), 200
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError) as e:
        return jsonify({'message': str(e)}), 401

# --- LLM 쿼리 신규 라우트 ---
@app.route('/api/query', methods=['POST'])
def handle_query():
    # 1. 사용자 입력 받기
    data = request.get_json()
    user_query = data.get('query')
    if not user_query:
        return jsonify({'error': 'Query is required'}), 400

    # 2. LLM을 통해 SQL 생성
    llm_result = visualize_chain(user_query)
    if llm_result.get('error'):
        return jsonify(llm_result), 400

    sql_query = llm_result.get('sql')
    if not sql_query:
        return jsonify({'error': 'SQL generation failed'}), 500

    # 3. 생성된 SQL을 데이터베이스에서 실행
    try:
        with db.engine.connect() as connection:
            # SQLAlchemy 2.0 스타일로 text() 사용
            result_proxy = connection.execute(text(sql_query))

            # 컬럼 이름 가져오기
            columns = result_proxy.keys()

            # 결과 데이터를 JSON 친화적인 형태로 변환
            query_data = [dict(zip(columns, row)) for row in result_proxy.fetchall()]

        # 4. 프론트엔드로 최종 결과 전송
        return jsonify({
            'success': True,
            'llm_response': llm_result,
            'data': query_data
        })

    except Exception as e:
        print(f"Database Error: {e}")
        # 데이터베이스 에러 발생 시 LLM 결과만이라도 보내줌
        return jsonify({
            'error': 'Database query failed',
            'message': str(e),
            'llm_response': llm_result
        }), 500

# --------------------------------------------------------------------------
# 5. 앱 실행
# --------------------------------------------------------------------------
if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)