import pytest
from src.services.agent_service import agent_service

def test_run_code_python_success():
    code = "print('Hello from test runner!')\nx = 2 + 3\nprint('Sum:', x)"
    res = agent_service.run_code(code, "python")
    assert res["status"] == "success"
    assert "Hello from test runner!" in res["stdout"]
    assert "Sum: 5" in res["stdout"]
    assert res["exit_code"] == 0

def test_run_code_python_error():
    code = "raise ValueError('Intentional error for testing')"
    res = agent_service.run_code(code, "python")
    assert res["status"] == "error"
    assert "ValueError" in res["stderr"]
    assert res["exit_code"] != 0

def test_modify_code_fix_zero_division():
    code = "def divide(a, b):\n    return a / b\nprint(divide(10, 0))"
    res = agent_service.modify_code(code, "fix zero division", "fix", "python")
    assert res["status"] == "success"
    assert "divide" in res["modified_code"]
    assert len(res["explanation"]) > 10

def test_modify_code_optimize_duplicates():
    code = (
        "def find_duplicates(items):\n"
        "    dups = []\n"
        "    for x in items:\n"
        "        if items.count(x) > 1 and x not in dups:\n"
        "            dups.append(x)\n"
        "    return dups"
    )
    res = agent_service.modify_code(code, "optimize performance", "optimize", "python")
    assert res["status"] == "success"
    assert "find_duplicates" in res["modified_code"]
    assert len(res["diff"]) > 0

def test_explain_code():
    code = (
        "def bubble_sort(arr):\n"
        "    n = len(arr)\n"
        "    for i in range(n):\n"
        "        for j in range(0, n - i - 1):\n"
        "            if arr[j] > arr[j + 1]:\n"
        "                arr[j], arr[j + 1] = arr[j + 1], arr[j]\n"
        "    return arr"
    )
    res = agent_service.explain_code(code, "python")
    assert res["status"] == "success"
    assert len(res["overview"]) > 10
    assert "complexity" in res
    assert len(res["logic_steps"]) > 0

def test_custom_action_unit_tests():
    code = "def add(a, b):\n    return a + b"
    res = agent_service.modify_code(code, "generate unit tests", "custom", "python")
    assert res["status"] == "success"
    assert "unittest" in res["modified_code"]
    assert "add" in res["modified_code"]
