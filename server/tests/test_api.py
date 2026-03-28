import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_root():
    """测试根路径"""
    response = client.get("/")
    assert response.status_code == 200
    assert "name" in response.json()
    assert "version" in response.json()


def test_health():
    """测试健康检查"""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_get_survey_questions():
    """测试获取问卷问题"""
    response = client.get("/api/v1/survey/questions")
    assert response.status_code == 200
    questions = response.json()
    assert isinstance(questions, list)
    assert len(questions) > 0
    assert "id" in questions[0]
    assert "type" in questions[0]
    assert "question" in questions[0]


def test_submit_survey():
    """测试提交问卷"""
    response = client.post(
        "/api/v1/survey/submit",
        json={
            "answers": [
                {"question_id": "career", "answer": "软件开发"},
                {"question_id": "experience", "answer": "3-5年"},
                {"question_id": "goals", "answer": ["提升表达能力", "克服紧张"]},
                {"question_id": "style", "answer": "友善温和"},
            ]
        },
    )
    assert response.status_code == 200
    profile = response.json()
    assert profile["career"] == "软件开发"
    assert profile["experience"] == "3-5年"


def test_get_current_user():
    """测试获取用户信息"""
    response = client.get("/api/v1/users/me")
    assert response.status_code == 200
    user = response.json()
    assert "id" in user
    assert "nickname" in user
    assert "power" in user


def test_generate_avatar():
    """测试生成头像"""
    response = client.post(
        "/api/v1/avatars/generate", json={"career": "软件开发", "style": "professional"}
    )
    assert response.status_code == 200
    avatar = response.json()
    assert "avatar_id" in avatar
    assert "sprite_url" in avatar
    assert "preview_url" in avatar


# 注意：面试接口测试需要火山引擎SDK，跳过自动测试
# def test_start_interview():
#     response = client.post(
#         "/api/v1/interviews/start",
#         json={
#             "type": "hr",
#             "difficulty": "medium",
#             "position": "软件开发"
#         }
#     )
#     assert response.status_code == 200
#     data = response.json()
#     assert "session_id" in data
#     assert "first_question" in data
