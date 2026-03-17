from __future__ import annotations

from dataclasses import dataclass
from typing import Any
import json
import socket
from urllib.parse import urlparse


def _encode_bulk(value: str) -> bytes:
    raw = value.encode("utf-8")
    return f"${len(raw)}\r\n".encode("utf-8") + raw + b"\r\n"


def _encode_command(parts: list[str]) -> bytes:
    out = f"*{len(parts)}\r\n".encode("utf-8")
    for part in parts:
        out += _encode_bulk(part)
    return out


def _read_line(sock: socket.socket) -> bytes:
    data = b""
    while not data.endswith(b"\r\n"):
        chunk = sock.recv(1)
        if not chunk:
            break
        data += chunk
    return data[:-2]


def _parse_response(sock: socket.socket) -> Any:
    prefix = sock.recv(1)
    if not prefix:
        return None
    if prefix == b"+":
        return _read_line(sock).decode("utf-8")
    if prefix == b"-":
        raise RuntimeError(_read_line(sock).decode("utf-8"))
    if prefix == b":":
        return int(_read_line(sock).decode("utf-8"))
    if prefix == b"$":
        length = int(_read_line(sock).decode("utf-8"))
        if length < 0:
            return None
        value = b""
        while len(value) < length:
            value += sock.recv(length - len(value))
        sock.recv(2)  # CRLF
        return value.decode("utf-8")
    if prefix == b"*":
        count = int(_read_line(sock).decode("utf-8"))
        if count < 0:
            return None
        return [_parse_response(sock) for _ in range(count)]
    return None


@dataclass
class RedisQueueConfig:
    host: str
    port: int
    db: int


def parse_redis_url(url: str) -> RedisQueueConfig:
    parsed = urlparse(url)
    host = parsed.hostname or "localhost"
    port = parsed.port or 6379
    db = int((parsed.path or "/0").strip("/") or "0")
    return RedisQueueConfig(host=host, port=port, db=db)


class RedisQueue:
    def __init__(self, redis_url: str, queue_name: str = "lyra:repair:jobs") -> None:
        self.cfg = parse_redis_url(redis_url)
        self.queue_name = queue_name

    def _send(self, *parts: str) -> Any:
        with socket.create_connection((self.cfg.host, self.cfg.port), timeout=4) as sock:
            sock.sendall(_encode_command(["SELECT", str(self.cfg.db)]))
            _parse_response(sock)
            sock.sendall(_encode_command(list(parts)))
            return _parse_response(sock)

    def enqueue(self, payload: dict[str, Any]) -> int:
        raw = json.dumps(payload)
        result = self._send("LPUSH", self.queue_name, raw)
        return int(result or 0)

    def dequeue(self, timeout_seconds: int = 1) -> dict[str, Any] | None:
        result = self._send("BRPOP", self.queue_name, str(timeout_seconds))
        if not result or not isinstance(result, list) or len(result) != 2:
            return None
        _, raw = result
        if not raw:
            return None
        return json.loads(raw)

    def size(self) -> int:
        result = self._send("LLEN", self.queue_name)
        return int(result or 0)

