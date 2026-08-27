import os
import signal
import subprocess
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HEALTH_URL = "http://127.0.0.1:8000/api/health"
FRONTEND_URL = "http://127.0.0.1:3002/"


def wait_for_url(url: str, expected_text: str, timeout: float = 12.0) -> None:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        try:
            with urllib.request.urlopen(url, timeout=0.5) as response:
                body = response.read().decode("utf-8")
                if response.status == 200 and expected_text in body:
                    return
        except (urllib.error.URLError, TimeoutError):
            time.sleep(0.1)
    raise AssertionError(f"development service did not become healthy: {url}")


def assert_url_stops(url: str, timeout: float = 5.0) -> None:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        try:
            urllib.request.urlopen(url, timeout=0.25).close()
        except (urllib.error.URLError, TimeoutError):
            return
        time.sleep(0.1)
    raise AssertionError(f"development service did not stop: {url}")


def test_make_dev_stops_without_double_wait_error() -> None:
    process = subprocess.Popen(
        ["make", "dev"],
        cwd=ROOT,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        start_new_session=True,
    )
    try:
        wait_for_url(HEALTH_URL, '"service":"exam-tool-demo"')
        wait_for_url(FRONTEND_URL, "智阅考试工具 Demo")
        os.killpg(process.pid, signal.SIGINT)
        output, _ = process.communicate(timeout=10)
    finally:
        if process.poll() is None:
            os.killpg(process.pid, signal.SIGKILL)
            process.wait(timeout=5)

    assert "not a child" not in output
    assert_url_stops(HEALTH_URL)
    assert_url_stops(FRONTEND_URL)
